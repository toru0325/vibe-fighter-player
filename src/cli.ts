#!/usr/bin/env node

/**
 * Vibe Fighter Player - CLI Entry Point
 *
 * Claude Codeの会話履歴をリアルタイムでストリーミングするCLIツール
 */

import { Command, Option } from 'commander';
import { ClaudeConversationWatcher } from './watcher';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { PlayerSourceType } from './types';

type CliOptions = {
  playerId: string;
  type: PlayerSourceType;
  root?: string;
  endpoint?: string;
  apiKey?: string;
  verbose?: boolean;
};

const SOURCE_ROOTS: Record<PlayerSourceType, string> = {
  claudecode: join(homedir(), '.claude', 'projects'),
  codex: join(homedir(), '.codex', 'sessions')
};

const program = new Command();

program
  .name('vibe-fighter-player')
  .description('Claude Code conversation player for Vibe Fighter events')
  .version('1.0.0')
  .requiredOption('-p, --player-id <id>', 'Player identifier (e.g., player-01, team-alpha)')
  .addOption(
    new Option('-t, --type <source>', 'Log source type (claudecode | codex)')
      .choices(['claudecode', 'codex'])
      .makeOptionMandatory(true)
  )
  .option('-r, --root <path>', 'Override root directory to watch (optional)')
  .option('-e, --endpoint <url>', 'Firebase Functions endpoint URL')
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('--verbose', 'Verbose logging')
  .action((options: CliOptions) => {
    startPlayer(options);
  });

program.parse();

function expandUserPath(pathValue: string): string {
  // ~ や %USERPROFILE% を展開して絶対パスに変換する
  const normalized = pathValue
    .replace(/^~/, homedir())
    .replace(/%USERPROFILE%/g, homedir());
  return resolve(normalized);
}

function startPlayer(options: CliOptions) {
  const sourceType = options.type;
  const defaultRoot = SOURCE_ROOTS[sourceType];
  const requestedRoot = options.root ?? defaultRoot;
  const absoluteRoot = expandUserPath(requestedRoot);

  // バナー表示
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║         🎮 Vibe Fighter Player v1.0.0          ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🧭 Source Type: ${sourceType}`);
  console.log(`📁 Watching: ${absoluteRoot}/**/*.jsonl`);
  console.log(`🎮 Player ID: ${options.playerId}`);
  console.log(`📤 Endpoint: ${options.endpoint || 'Not configured'}`);
  console.log('');

  // エンドポイント未設定の警告
  if (!options.endpoint) {
    console.log('⚠️  WARNING: No endpoint configured. Messages will not be sent.');
    console.log('   Use --endpoint option to specify Firebase Functions URL');
    console.log('');
  }

  const watcher = new ClaudeConversationWatcher({
    rootPath: absoluteRoot,
    playerId: options.playerId,
    type: sourceType,
    endpoint: options.endpoint ?? '',
    apiKey: options.apiKey ?? '',
    verbose: options.verbose ?? false
  });

  watcher.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log('👋 Shutting down gracefully...');
    watcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('');
    console.log('👋 Shutting down gracefully...');
    watcher.stop();
    process.exit(0);
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    watcher.stop();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    watcher.stop();
    process.exit(1);
  });
}
