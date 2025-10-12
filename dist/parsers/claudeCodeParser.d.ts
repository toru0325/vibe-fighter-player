/**
 * Claude Code向けのログパーサー
 *
 * 1行分のJSONを解析し、ユーザー／アシスタントのメッセージを抽出する
 */
import { ProcessedMessage } from '../types';
/**
 * Claude CodeのJSONLレコードをProcessedMessageに変換
 */
export declare function parseClaudeCodeEntry(entry: unknown): ProcessedMessage | null;
//# sourceMappingURL=claudeCodeParser.d.ts.map