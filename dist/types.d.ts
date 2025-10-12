/**
 * Vibe Fighter Player - Type Definitions
 */
export type PlayerSourceType = 'claudecode' | 'codex';
export interface PlayerConfig {
    rootPath: string;
    playerId: string;
    type: PlayerSourceType;
    endpoint: string;
    apiKey: string;
    verbose: boolean;
}
export interface ProcessedMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}
export interface FilePosition {
    [filePath: string]: number;
}
export interface JSONLEntry {
    type: 'user' | 'assistant' | string;
    message?: {
        role: string;
        content: string | ContentBlock[];
    };
    uuid: string;
    timestamp: string;
    sessionId?: string;
    parentUuid?: string | null;
    cwd?: string;
    version?: string;
}
export interface ContentBlock {
    type: 'text';
    text?: unknown;
    name?: string;
    input?: any;
    tool_use_id?: string;
    content?: string;
    is_error?: boolean;
}
//# sourceMappingURL=types.d.ts.map