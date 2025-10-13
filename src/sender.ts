/**
 * Vibe Fighter Player - Message Sender
 *
 * パースされたメッセージをFirebase Functionsに送信
 */

import axios, { AxiosError } from 'axios';
import { ProcessedMessage, PlayerConfig } from './types';

export class MessageSender {
  private config: PlayerConfig;
  private messageCount = 0;
  private lastSent: {
    content: string;
    timestamp: number;
  } | null = null;

  constructor(config: PlayerConfig) {
    this.config = config;
  }

  /**
   * メッセージをFirebase Functionsに送信
   *
   * @param message - 送信するメッセージ
   * @param filePath - ソースファイルパス（ログ用）
   */
  async send(message: ProcessedMessage, filePath: string): Promise<void> {
    // 重複チェック: 500ms以内に同じcontentなら送信をスキップ
    const now = Date.now();
    if (this.lastSent &&
        this.lastSent.content === message.content &&
        (now - this.lastSent.timestamp) <= 500) {
      if (this.config.verbose) {
        console.log('⏭️  Skipped duplicate message (within 500ms)');
      }
      return;
    }

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

      // 送信成功扱いで記録を更新
      this.lastSent = {
        content: message.content,
        timestamp: now
      };
      return;
    }

    try {
      await axios.post(
        this.config.endpoint,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && {
              'x-api-key': this.config.apiKey
            })
          },
          timeout: 10000
        }
      );

      this.messageCount++;

      // 送信成功メッセージ
      const preview = message.content.length > 50
        ? message.content.substring(0, 50) + '...'
        : message.content;

      const roleEmoji = message.role === 'user' ? '👤' : '🤖';
      console.log(`✅ [${this.messageCount}] ${roleEmoji} ${message.role}: ${preview}`);

      // 送信成功後に記録を更新
      this.lastSent = {
        content: message.content,
        timestamp: now
      };

    } catch (error) {
      this.handleSendError(error, message);
    }
  }

  /**
   * 送信エラーのハンドリング
   */
  private handleSendError(error: unknown, message: ProcessedMessage): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // サーバーがエラーレスポンスを返した場合
        console.error(
          `❌ HTTP ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`
        );
      } else if (axiosError.request) {
        // リクエストは送信されたがレスポンスがない場合
        console.error('❌ No response from server (timeout or network error)');
      } else {
        // リクエスト設定中のエラー
        console.error('❌ Request setup error:', axiosError.message);
      }
    } else if (error instanceof Error) {
      console.error('❌ Send error:', error.message);
    } else {
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
  getStats(): { messageCount: number } {
    return {
      messageCount: this.messageCount
    };
  }
}
