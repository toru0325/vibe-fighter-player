"use strict";
/**
 * Vibe Fighter Player - Message Sender
 *
 * パースされたメッセージをFirebase Functionsに送信
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSender = void 0;
const axios_1 = __importDefault(require("axios"));
class MessageSender {
    constructor(config) {
        this.messageCount = 0;
        this.config = config;
    }
    /**
     * メッセージをFirebase Functionsに送信
     *
     * @param message - 送信するメッセージ
     * @param filePath - ソースファイルパス（ログ用）
     */
    async send(message, filePath) {
        const payload = {
            playerId: this.config.playerId,
            type: this.config.type,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp
        };
        // エンドポイントがない場合はペイロードをログ出力
        if (!this.config.endpoint) {
            this.messageCount++;
            console.log('\n📦 Would send to Firebase:');
            console.log('─'.repeat(60));
            console.log(JSON.stringify(payload, null, 2));
            console.log('─'.repeat(60));
            return;
        }
        try {
            await axios_1.default.post(this.config.endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey && {
                        'x-api-key': this.config.apiKey
                    })
                },
                timeout: 10000
            });
            this.messageCount++;
            // 送信成功メッセージ
            const preview = message.content.length > 50
                ? message.content.substring(0, 50) + '...'
                : message.content;
            const roleEmoji = message.role === 'user' ? '👤' : '🤖';
            console.log(`✅ [${this.messageCount}] ${roleEmoji} ${message.role}: ${preview}`);
        }
        catch (error) {
            this.handleSendError(error, message);
        }
    }
    /**
     * 送信エラーのハンドリング
     */
    handleSendError(error, message) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.response) {
                // サーバーがエラーレスポンスを返した場合
                console.error(`❌ HTTP ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
            }
            else if (axiosError.request) {
                // リクエストは送信されたがレスポンスがない場合
                console.error('❌ No response from server (timeout or network error)');
            }
            else {
                // リクエスト設定中のエラー
                console.error('❌ Request setup error:', axiosError.message);
            }
        }
        else if (error instanceof Error) {
            console.error('❌ Send error:', error.message);
        }
        else {
            console.error('❌ Unknown send error:', error);
        }
        if (this.config.verbose) {
            console.error('Failed message:', {
                type: this.config.type,
                role: message.role,
                content: message.content.substring(0, 100),
                timestamp: message.timestamp
            });
        }
    }
    /**
     * 送信統計を取得
     */
    getStats() {
        return {
            messageCount: this.messageCount
        };
    }
}
exports.MessageSender = MessageSender;
//# sourceMappingURL=sender.js.map