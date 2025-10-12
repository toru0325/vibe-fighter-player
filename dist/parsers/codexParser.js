"use strict";
/**
 * Codex CLI向けのログパーサー
 *
 * 1行分のJSONを解析し、ユーザー／アシスタントのメッセージを抽出する
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCodexEntry = parseCodexEntry;
/**
 * デバッグログを出力（環境変数 VIBE_FIGHTER_DEBUG に 'codex' が含まれる場合のみ）
 */
function debugCodex(message, data) {
    const flag = process.env.VIBE_FIGHTER_DEBUG || '';
    const tokens = flag
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    if (!tokens.includes('codex')) {
        return;
    }
    const prefix = '[CodexParser]';
    if (data !== undefined) {
        console.log(`${prefix} ${message}`, data);
    }
    else {
        console.log(`${prefix} ${message}`);
    }
}
/**
 * Codexのcontentフィールドからテキストを再帰的に抽出
 */
function extractCodexTexts(value) {
    if (!value) {
        return [];
    }
    if (typeof value === 'string') {
        return [value];
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
    }
    if (Array.isArray(value)) {
        const collected = [];
        for (const item of value) {
            collected.push(...extractCodexTexts(item));
        }
        return collected;
    }
    if (typeof value === 'object') {
        const block = value;
        const collected = [];
        if (block.text !== undefined) {
            collected.push(...extractCodexTexts(block.text));
        }
        // Codex側でネストされた構造が追加されても拾えるように代表的なキーを巡る
        for (const key of ['content', 'children', 'elements', 'value', 'body']) {
            if (key in block) {
                collected.push(...extractCodexTexts(block[key]));
            }
        }
        return collected;
    }
    return [];
}
/**
 * CodexのJSONLレコードをProcessedMessageに変換
 */
function parseCodexEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const codex = entry;
    if (codex.type === 'message' && codex.role && codex.content !== undefined) {
        const textParts = extractCodexTexts(codex.content)
            .map((text) => text.trim())
            .filter((text) => text.length > 0);
        if (textParts.length === 0) {
            debugCodex('旧形式messageでテキスト抽出に失敗', codex);
            return null;
        }
        const fullText = textParts.join('\n');
        return {
            role: codex.role === 'assistant' ? 'assistant' : 'user',
            content: fullText,
            timestamp: codex.timestamp || new Date().toISOString()
        };
    }
    if (codex.type !== 'response_item') {
        return null;
    }
    const payload = codex.payload;
    if (!payload || payload.type !== 'message') {
        return null;
    }
    if (payload.role !== 'user' && payload.role !== 'assistant') {
        return null;
    }
    const textParts = extractCodexTexts(payload.content).map((text) => text.trim()).filter((text) => text.length > 0);
    if (textParts.length === 0) {
        debugCodex('response_itemでテキスト抽出に失敗', { payload });
        return null;
    }
    const fullText = textParts.join('\n');
    return {
        role: payload.role === 'assistant' ? 'assistant' : 'user',
        content: fullText,
        timestamp: codex.timestamp || new Date().toISOString()
    };
}
//# sourceMappingURL=codexParser.js.map