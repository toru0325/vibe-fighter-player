"use strict";
/**
 * Vibe Fighter Player - Message Parser
 *
 * JSONL形式の1行を解析し、Firebase送信に利用するメッセージ形式へ変換する
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessage = parseMessage;
const claudeCodeParser_1 = require("./parsers/claudeCodeParser");
const codexParser_1 = require("./parsers/codexParser");
const parsers = [
    claudeCodeParser_1.parseClaudeCodeEntry,
    codexParser_1.parseCodexEntry
];
/**
 * JSONL行をパースしてProcessedMessageに変換
 *
 * @param line - JSONL形式の1行
 * @returns ProcessedMessage または null（スキップする場合）
 */
function parseMessage(line) {
    // JSONLファイルにはデバッグログが混ざる可能性があるため、先にJSONかどうかを軽く判定する
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0 ||
        trimmedLine.startsWith('[DEBUG]') ||
        !/^[{\[]/.test(trimmedLine)) {
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
    }
    catch (error) {
        // JSONとして解釈できなければエラーを出さずにスキップする（ウォッチャーのノイズ防止）
        return null;
    }
}
//# sourceMappingURL=parser.js.map