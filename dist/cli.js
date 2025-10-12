#!/usr/bin/env node
"use strict";
/**
 * Vibe Fighter Player - CLI Entry Point
 *
 * Claude Codeの会話履歴をリアルタイムでストリーミングするCLIツール
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const watcher_1 = require("./watcher");
const os_1 = require("os");
const path_1 = require("path");
const SOURCE_ROOTS = {
    claudecode: (0, path_1.join)((0, os_1.homedir)(), '.claude', 'projects'),
    codex: (0, path_1.join)((0, os_1.homedir)(), '.codex', 'sessions')
};
const program = new commander_1.Command();
program
    .name('vibe-fighter-player')
    .description('Claude Code conversation player for Vibe Fighter events')
    .version('1.0.0')
    .requiredOption('-p, --player-id <id>', 'Player identifier (e.g., player-01, team-alpha)')
    .addOption(new commander_1.Option('-t, --type <source>', 'Log source type (claudecode | codex)')
    .choices(['claudecode', 'codex'])
    .makeOptionMandatory(true))
    .option('-r, --root <path>', 'Override root directory to watch (optional)')
    .option('-e, --endpoint <url>', 'Firebase Functions endpoint URL')
    .option('-k, --api-key <key>', 'API key for authentication')
    .option('--verbose', 'Verbose logging')
    .action((options) => {
    startPlayer(options);
});
program.parse();
function expandUserPath(pathValue) {
    // ~ や %USERPROFILE% を展開して絶対パスに変換する
    const normalized = pathValue
        .replace(/^~/, (0, os_1.homedir)())
        .replace(/%USERPROFILE%/g, (0, os_1.homedir)());
    return (0, path_1.resolve)(normalized);
}
function startPlayer(options) {
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
    const watcher = new watcher_1.ClaudeConversationWatcher({
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
//# sourceMappingURL=cli.js.map