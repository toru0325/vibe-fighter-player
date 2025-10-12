/**
 * Vibe Fighter Player - File Watcher
 *
 * Claude Codeの会話ファイル（JSONL）を監視し、
 * 新しいメッセージを検出してFirebaseに送信
 */
import { PlayerConfig } from './types';
export declare class ClaudeConversationWatcher {
    private watcher?;
    private positions;
    private positionsFile;
    private sender;
    private config;
    private compactLogging;
    private isReady;
    constructor(config: PlayerConfig);
    /**
     * ファイル監視を開始
     */
    start(): Promise<void>;
    /**
     * ファイル監視を停止
     */
    stop(): void;
    /**
     * ファイルの変更を処理
     */
    private processFileChanges;
    /**
     * ファイル位置情報を保存
     */
    private savePositions;
    /**
     * ファイル位置情報を読み込み
     */
    private loadPositions;
}
//# sourceMappingURL=watcher.d.ts.map