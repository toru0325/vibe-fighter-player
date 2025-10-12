/**
 * Vibe Fighter Player - Message Parser
 *
 * JSONL形式の1行を解析し、Firebase送信に利用するメッセージ形式へ変換する
 */
import { ProcessedMessage } from './types';
/**
 * JSONL行をパースしてProcessedMessageに変換
 *
 * @param line - JSONL形式の1行
 * @returns ProcessedMessage または null（スキップする場合）
 */
export declare function parseMessage(line: string): ProcessedMessage | null;
//# sourceMappingURL=parser.d.ts.map