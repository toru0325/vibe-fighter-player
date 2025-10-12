"use strict";
/**
 * Vibe Fighter Player - File Watcher
 *
 * Claude Codeの会話ファイル（JSONL）を監視し、
 * 新しいメッセージを検出してFirebaseに送信
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeConversationWatcher = void 0;
const chokidar_1 = require("chokidar");
const fs_1 = require("fs");
const path_1 = require("path");
const parser_1 = require("./parser");
const sender_1 = require("./sender");
class ClaudeConversationWatcher {
    constructor(config) {
        this.positions = {};
        this.config = config;
        this.positionsFile = (0, path_1.join)(process.cwd(), '.vibe-fighter-positions.json');
        this.sender = new sender_1.MessageSender(config);
        this.loadPositions();
        // デフォルトはコンパクト表示。詳細ログが欲しいときだけ VIBE_FIGHTER_FULL_LOG=1 を指定する
        this.compactLogging = process.env.VIBE_FIGHTER_FULL_LOG !== '1';
        this.isReady = false; // chokidarの初期スキャンが終わるまでは既存ログを送らない
    }
    /**
     * ファイル監視を開始
     */
    async start() {
        const pattern = (0, path_1.join)(this.config.rootPath, '**', '*.jsonl');
        if (this.config.verbose) {
            console.log(`🔍 Watching pattern: ${pattern}`);
        }
        // ポーリング方式に統一（重複送信防止、全OS対応）
        const usePolling = true;
        this.watcher = (0, chokidar_1.watch)(pattern, {
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
    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.savePositions();
        }
        const stats = this.sender.getStats();
        console.log(`\n📊 Total messages sent: ${stats.messageCount}`);
    }
    /**
     * ファイルの変更を処理
     */
    async processFileChanges(filePath, shouldSend) {
        try {
            if (!(0, fs_1.existsSync)(filePath)) {
                return;
            }
            // ファイル全体を読み込み、JSONL行（空行除く）を順番に処理
            const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
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
                    continue; // 空行は行数に含めない
                }
                processedCount++; // 非空行の通し番号をカウント
                if (processedCount <= lastProcessedCount) {
                    continue; // 既に処理済みの行はスキップ
                }
                try {
                    const message = (0, parser_1.parseMessage)(line);
                    if (message) {
                        await this.sender.send(message, filePath);
                    }
                }
                catch (error) {
                    console.error('❌ Parse error:', error);
                    if (this.config.verbose) {
                        console.error('Problematic line:', line.substring(0, 200));
                    }
                }
            }
            // 最新の処理済み件数を保存
            this.positions[filePath] = totalNonEmptyLines;
            this.savePositions();
        }
        catch (error) {
            console.error(`❌ Error processing file ${filePath}:`, error);
        }
    }
    /**
     * ファイル位置情報を保存
     */
    savePositions() {
        try {
            (0, fs_1.writeFileSync)(this.positionsFile, JSON.stringify(this.positions, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('❌ Error saving positions:', error);
        }
    }
    /**
     * ファイル位置情報を読み込み
     */
    loadPositions() {
        try {
            if ((0, fs_1.existsSync)(this.positionsFile)) {
                const data = (0, fs_1.readFileSync)(this.positionsFile, 'utf-8');
                this.positions = JSON.parse(data);
                if (this.config.verbose) {
                    console.log(`📂 Loaded positions for ${Object.keys(this.positions).length} files`);
                }
            }
        }
        catch (error) {
            if (this.config.verbose) {
                console.log('⚠️  Could not load positions, starting fresh');
            }
            this.positions = {};
        }
    }
}
exports.ClaudeConversationWatcher = ClaudeConversationWatcher;
//# sourceMappingURL=watcher.js.map