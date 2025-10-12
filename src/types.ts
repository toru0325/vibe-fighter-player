/**
 * Vibe Fighter Player - Type Definitions
 */

export type PlayerSourceType = 'claudecode' | 'codex';

export interface PlayerConfig {
  rootPath: string;           // 監視ルートディレクトリ
  playerId: string;           // プレイヤー識別子（Firebase連携用）
  type: PlayerSourceType;     // ログソース種別（claudecode or codex）
  endpoint: string;           // Firebase Functions URL
  apiKey: string;             // API認証キー
  verbose: boolean;           // 詳細ログ
}

export interface ProcessedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface FilePosition {
  [filePath: string]: number;  // ファイルパス -> 最後に読んだ行数
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
  text?: unknown;            // Claude Code側の更新で複雑化したためunknownで受ける
  name?: string;
  input?: any;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}
