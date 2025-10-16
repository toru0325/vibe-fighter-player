/**
 * Vibe Fighter Player - File Watcher
 *
 * Claude Codeの会話ファイル（JSONL）を監視し、
 * 新しいメッセージを検出してFirebaseに送信
 */

import { watch, FSWatcher } from 'chokidar';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { PlayerConfig, FilePosition } from './types';
import { parseMessage } from './parser';
import { MessageSender } from './sender';

/**
 * OSの標準キャッシュディレクトリを取得
 * macOS: ~/Library/Caches/vibe-fighter/
 * Linux: ~/.cache/vibe-fighter/
 * Windows: %LOCALAPPDATA%\vibe-fighter\Cache\
 */
function getCacheDir(): string {
  const home = homedir();
  const plat = platform();

  let cacheBase: string;

  if (plat === 'darwin') {
    cacheBase = join(home, 'Library', 'Caches');
  } else if (plat === 'win32') {
    cacheBase = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local');
  } else {
    // Linux and others
    cacheBase = process.env.XDG_CACHE_HOME || join(home, '.cache');
  }

  const vibeFighterCache = join(cacheBase, 'vibe-fighter');

  // ディレクトリが存在しない場合は作成
  if (!existsSync(vibeFighterCache)) {
    mkdirSync(vibeFighterCache, { recursive: true });
  }

  return vibeFighterCache;
}

export class ClaudeConversationWatcher {
  private watcher?: FSWatcher;
  private positions: FilePosition = {};
  private positionsFile: string;
  private sender: MessageSender;
  private config: PlayerConfig;
  private compactLogging: boolean;
  private isReady: boolean;

  constructor(config: PlayerConfig) {
    this.config = config;
    const cacheDir = getCacheDir();
    const timestamp = Date.now();
    this.positionsFile = join(cacheDir, `positions-${config.playerId}-${timestamp}.json`);
    this.sender = new MessageSender(config);
    this.loadPositions();
    // デフォルトはコンパクト表示。詳細ログが欲しいときだけ VIBE_FIGHTER_FULL_LOG=1 を指定する
    this.compactLogging = process.env.VIBE_FIGHTER_FULL_LOG !== '1';
    this.isReady = false; // chokidarの初期スキャンが終わるまでは既存ログを送らない
  }

  /**
   * ファイル監視を開始
   */
  async start(): Promise<void> {
    const pattern = join(this.config.rootPath, '**', '*.jsonl');

    if (this.config.verbose) {
      console.log(`🔍 Watching pattern: ${pattern}`);
    }

    // ポーリング方式に統一（重複送信防止、全OS対応）
    const usePolling = true;

    this.watcher = watch(pattern, {
      persistent: true,
      ignoreInitial: false,
      usePolling,
      interval: 500,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher.on('add', async (filePath) => {
      if (this.config.verbose && !this.compactLogging) {
        console.log(`➕ New session file: ${filePath}`);
      }
      // 初期スキャン中は既存ログをFirebaseに送らずにポインタだけ進める
      await this.processFileChanges(filePath, this.isReady);
    });

    this.watcher.on('change', async (filePath) => {
      if (this.config.verbose && !this.compactLogging) {
        console.log(`📝 File changed: ${filePath}`);
      }
      await this.processFileChanges(filePath, this.isReady);
    });

    this.watcher.on('unlink', (filePath) => {
      if (this.config.verbose) {
        console.log(`🗑️  File deleted: ${filePath}`);
      }
      delete this.positions[filePath];
      this.savePositions();
    });

    this.watcher.on('error', (error) => {
      console.error('❌ Watcher error:', error);
    });

    this.watcher.on('ready', () => {
      // chokidarが初期スキャンを完了したタイミングで送信モードに切り替える
      this.isReady = true;
      if (this.config.verbose) {
        console.log('⏱️  Initial scan completed. Live messages will be sent from now on.');
      }
    });

    console.log('✅ Player started successfully');
    console.log('Press Ctrl+C to stop\n');
  }

  /**
   * ファイル監視を停止
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
    }

    const stats = this.sender.getStats();
    console.log(`\n📊 Total messages sent: ${stats.messageCount}`);

    // プロセス終了時に位置情報ファイルを削除
    try {
      if (existsSync(this.positionsFile)) {
        unlinkSync(this.positionsFile);
        if (this.config.verbose) {
          console.log(`🗑️  Cleaned up positions file: ${this.positionsFile}`);
        }
      }
    } catch (error) {
      if (this.config.verbose) {
        console.error('⚠️  Failed to delete positions file:', error);
      }
    }
  }

  /**
   * ファイルの変更を処理
   */
  private async processFileChanges(
    filePath: string,
    shouldSend: boolean
  ): Promise<void> {
    try {
      if (!existsSync(filePath)) {
        return;
      }

      // ファイル全体を読み込み、JSONL行（空行除く）を順番に処理
      const content = readFileSync(filePath, 'utf-8');
      const allLines = content.split('\n');

      const totalNonEmptyLines = allLines.filter((line) => line.trim().length > 0).length;
      const recordedPosition = this.positions[filePath] || 0;
      const lastProcessedCount = Math.min(recordedPosition, totalNonEmptyLines);

      if (!shouldSend) {
        // 起動時に積み残されたログがあっても送信せずに読み取り位置だけ進める
        this.positions[filePath] = totalNonEmptyLines;
        this.savePositions();
        if (this.config.verbose && !this.compactLogging) {
          console.log(`⏭️  Skipped existing ${totalNonEmptyLines} entries for ${filePath}`);
        }
        return;
      }

      if (this.config.verbose && !this.compactLogging) {
        console.log(`📏 Total entries: ${totalNonEmptyLines}, Last processed: ${lastProcessedCount}`);
      }

      if (totalNonEmptyLines <= lastProcessedCount) {
        if (recordedPosition !== totalNonEmptyLines) {
          this.positions[filePath] = totalNonEmptyLines;
          this.savePositions();
        }
        return; // 新しいエントリがないため終了
      }

      if (this.config.verbose && !this.compactLogging) {
        console.log(`📖 Processing ${totalNonEmptyLines - lastProcessedCount} new entries from ${filePath}`);
      }

      let processedCount = 0;

      for (const line of allLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;  // 空行は行数に含めない
        }

        processedCount++;  // 非空行の通し番号をカウント

        if (processedCount <= lastProcessedCount) {
          continue;  // 既に処理済みの行はスキップ
        }

        try {
          const message = parseMessage(line);
          if (message) {
            await this.sender.send(message, filePath);
          }
        } catch (error) {
          console.error('❌ Parse error:', error);
          if (this.config.verbose) {
            console.error('Problematic line:', line.substring(0, 200));
          }
        }
      }

      // 最新の処理済み件数を保存
      this.positions[filePath] = totalNonEmptyLines;
      this.savePositions();

    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
    }
  }

  /**
   * ファイル位置情報を保存
   */
  private savePositions(): void {
    try {
      writeFileSync(
        this.positionsFile,
        JSON.stringify(this.positions, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('❌ Error saving positions:', error);
    }
  }

  /**
   * ファイル位置情報を読み込み
   */
  private loadPositions(): void {
    try {
      if (existsSync(this.positionsFile)) {
        const data = readFileSync(this.positionsFile, 'utf-8');
        this.positions = JSON.parse(data);

        if (this.config.verbose) {
          console.log(`📂 Loaded positions for ${Object.keys(this.positions).length} files`);
        }
      }
    } catch (error) {
      if (this.config.verbose) {
        console.log('⚠️  Could not load positions, starting fresh');
      }
      this.positions = {};
    }
  }
}
