/**
 * Vibe Fighter Player - Message Sender
 *
 * パースされたメッセージをFirebase Functionsに送信
 */
import { ProcessedMessage, PlayerConfig } from './types';
export declare class MessageSender {
    private config;
    private messageCount;
    constructor(config: PlayerConfig);
    /**
     * メッセージをFirebase Functionsに送信
     *
     * @param message - 送信するメッセージ
     * @param filePath - ソースファイルパス（ログ用）
     */
    send(message: ProcessedMessage, filePath: string): Promise<void>;
    /**
     * 送信エラーのハンドリング
     */
    private handleSendError;
    /**
     * 送信統計を取得
     */
    getStats(): {
        messageCount: number;
    };
}
//# sourceMappingURL=sender.d.ts.map