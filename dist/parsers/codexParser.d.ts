/**
 * Codex CLI向けのログパーサー
 *
 * 1行分のJSONを解析し、ユーザー／アシスタントのメッセージを抽出する
 */
import { ProcessedMessage } from '../types';
/**
 * CodexのJSONLレコードをProcessedMessageに変換
 */
export declare function parseCodexEntry(entry: unknown): ProcessedMessage | null;
//# sourceMappingURL=codexParser.d.ts.map