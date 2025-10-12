/**
 * Vibe Fighter Player - Message Parser
 *
 * JSONL形式の1行を解析し、Firebase送信に利用するメッセージ形式へ変換する
 */

import { ProcessedMessage } from './types';
import { parseClaudeCodeEntry } from './parsers/claudeCodeParser';
import { parseCodexEntry } from './parsers/codexParser';

type ParserFunction = (entry: unknown) => ProcessedMessage | null;

const parsers: ParserFunction[] = [
  parseClaudeCodeEntry,
  parseCodexEntry
];

/**
 * JSONL行をパースしてProcessedMessageに変換
 *
 * @param line - JSONL形式の1行
 * @returns ProcessedMessage または null（スキップする場合）
 */
export function parseMessage(line: string): ProcessedMessage | null {
  // JSONLファイルにはデバッグログが混ざる可能性があるため、先にJSONかどうかを軽く判定する
  const trimmedLine = line.trim();
  if (
    trimmedLine.length === 0 ||
    trimmedLine.startsWith('[DEBUG]') ||
    !/^[{\[]/.test(trimmedLine)
  ) {
    // JSONではない行は静かにスキップする
    return null;
  }

  try {
    // 上の軽量判定を通過した行のみJSON.parseを実行する
    const entry = JSON.parse(trimmedLine);

    for (const parser of parsers) {
      const result = parser(entry);
      if (result) {
        return result;
      }
    }

    // いずれのパーサーにも該当しなかった場合はスキップ
    return null;
  } catch (error) {
    // JSONとして解釈できなければエラーを出さずにスキップする（ウォッチャーのノイズ防止）
    return null;
  }
}
