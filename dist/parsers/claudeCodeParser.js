"use strict";
/**
 * Claude Code向けのログパーサー
 *
 * 1行分のJSONを解析し、ユーザー／アシスタントのメッセージを抽出する
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClaudeCodeEntry = parseClaudeCodeEntry;
/**
 * Claude CodeのJSONLレコードをProcessedMessageに変換
 */
function parseClaudeCodeEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const json = entry;
    // ユーザーメッセージ（全文送信）
    if (json.type === 'user' && json.message?.content) {
        // ツール呼び出し結果などのブロックは無視し、テキストブロックのみを抽出する
        const content = extractTextContent(json.message.content);
        if (content) {
            return {
                role: 'user',
                content,
                timestamp: json.timestamp
            };
        }
        // テキストがない場合はスキップする
        return null;
    }
    // アシスタントメッセージ（全文送信）
    if (json.type === 'assistant' && json.message?.content) {
        const contentArray = normalizeContent(json.message.content);
        const textParts = extractTextBlocks(contentArray);
        if (textParts.length === 0) {
            return null;
        }
        const fullText = textParts.join('\n');
        return {
            role: 'assistant',
            content: fullText,
            timestamp: json.timestamp
        };
    }
    return null;
}
/**
 * コンテンツをContentBlock配列に正規化する
 */
function normalizeContent(content) {
    if (Array.isArray(content)) {
        return content;
    }
    // 文字列を受けた場合はtextブロックとしてラップする
    return [{ type: 'text', text: content }];
}
/**
 * テキストブロックの内容だけを抽出する
 */
function extractTextBlocks(contentArray) {
    return contentArray
        .filter((block) => block.type === 'text')
        .map((block) => {
        const value = block.text;
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (Array.isArray(value) || (value && typeof value === 'object')) {
            try {
                const jsonValue = JSON.stringify(value);
                return jsonValue ?? '';
            }
            catch {
                return '';
            }
        }
        return '';
    })
        .filter((text) => text.trim().length > 0);
}
/**
 * ユーザーコンテンツのテキストのみを抽出し結合する
 */
function extractTextContent(content) {
    if (typeof content === 'string') {
        // 文字列はそのまま返す
        return content.trim().length > 0 ? content : null;
    }
    const contentArray = normalizeContent(content);
    const textParts = extractTextBlocks(contentArray);
    if (textParts.length === 0) {
        return null;
    }
    return textParts.join('\n');
}
//# sourceMappingURL=claudeCodeParser.js.map