# 🎮 Vibe Fighter Player

Vibe Fighterに参加するプレイヤー側のツール。
Claude Code / Codex の会話履歴をリアルタイムでストリーミングし、Vibe Fighterダッシュボードへ連携するクロスプラットフォーム対応CLIツール。

## 特徴

- 🔍 **自動監視**: `~/.claude/projects/` 配下の全JSONLファイルを自動監視
- 🚀 **リアルタイム送信**: 新しい会話を検出したら即座にFirebaseへ送信
- 🌍 **クロスプラットフォーム**: Windows/Mac/Linux完全対応
- 📦 **インストール不要**: npxで直接実行可能
- 🎯 **増分読み取り**: ファイルの差分のみを効率的に処理

## クイックスタート

### 前提条件

- Node.js 16.0.0 以上

```bash
node --version
```

### 実行方法

```bash
npx github:toru0325/vibe-fighter-player \
  --type claudecode \
  --player-id your-player-name \
  --endpoint https://your-firebase-url/postMessage \
  --api-key YOUR_API_KEY
```

### オプション

| オプション | 短縮形 | 説明 | デフォルト値 |
|----------|--------|------|-------------|
| `--type <source>` | `-t` | **[必須]** ログソース種別 (`claudecode` または `codex`) | - |
| `--player-id <id>` | `-p` | **[必須]** プレイヤー識別子 | - |
| `--root <path>` | `-r` | 監視ルート（任意指定） | ソース種別ごとに自動解決 |
| `--endpoint <url>` | `-e` | Firebase Functions エンドポイント | - |
| `--api-key <key>` | `-k` | API認証キー | - |
| `--max-length <number>` | - | AI返答の最大文字数 | 300 |
| `--verbose` | - | 詳細ログを表示 | false |
| `--help` | `-h` | ヘルプを表示 | - |
| `--version` | `-V` | バージョンを表示 | - |

> 💡 `claudecode` を選ぶとデフォルトで `~/.claude/projects/`、`codex` を選ぶと `~/.codex/sessions/` を監視します。`--root` を指定した場合はそのパスが優先されます。

## 使用例

### 基本的な使用方法

```bash
npx github:toru0325/vibe-fighter-player \
  -t claudecode \
  -p player-01 \
  -e https://us-central1-PROJECT.cloudfunctions.net/postMessage \
  -k abc123xyz
```

### カスタムディレクトリを監視

```bash
npx github:toru0325/vibe-fighter-player \
  -t claudecode \
  -p player-02 \
  -r ~/custom/claude/path \
  -e https://your-endpoint.com/postMessage
```

### 詳細ログを有効化

```bash
npx github:toru0325/vibe-fighter-player \
  -t codex \
  -p player-02 \
  -e https://your-endpoint.com/postMessage \
  --verbose
```

### ローカル開発（エンドポイントなし）

```bash
npx github:toru0325/vibe-fighter-player \
  -t claudecode \
  -p dev-player \
  --verbose
```

## 動作の仕組み

1. **監視開始**: 指定されたルートディレクトリ配下の `*.jsonl` ファイルを監視
2. **変更検出**: ファイルに新しい行が追加されたことを検出
3. **パース処理**: 新しい行をパースしてユーザー/AIメッセージを抽出
4. **送信**: Firebaseエンドポイントにメッセージをポスト
5. **位置記録**: ファイルの読み取り位置を `.vibe-fighter-positions.json` に保存

## ファイル構造

```
player/
├── src/
│   ├── cli.ts          # CLIエントリーポイント
│   ├── watcher.ts      # ファイル監視
│   ├── parser.ts       # JSONLパーサー
│   ├── sender.ts       # Firebase送信
│   └── types.ts        # 型定義
├── dist/               # ビルド後のJavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## 開発

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-username/vibe-fighter-player.git
cd vibe-fighter-player/player

# 依存関係をインストール
npm install

# ビルド
npm run build
```

### ローカルで実行

```bash
npm start -- -p dev-player -t claudecode --verbose
```

### 開発モード（自動リビルド）

```bash
npm run dev
```

## トラブルシューティング

### メッセージが送信されない

**症状**: プレイヤーは起動しているが、ダッシュボードにメッセージが表示されない

**原因と解決策**:
1. エンドポイントが正しく設定されているか確認
   ```bash
   --endpoint https://correct-url.com/postMessage
   ```

2. APIキーが正しいか確認
   ```bash
   --api-key YOUR_CORRECT_API_KEY
   ```

3. ネットワーク接続を確認
   ```bash
   curl https://your-endpoint.com/postMessage
   ```

4. 詳細ログで問題を特定
   ```bash
   --verbose
   ```

### ファイルが監視されない

**症状**: Claude Codeで会話しているが、プレイヤーが反応しない

**原因と解決策**:
1. rootパスが正しいか確認
   ```bash
   ls ~/.claude/projects
   ```

2. 明示的にパスを指定
   ```bash
   --root ~/.claude/projects --verbose
   ```

3. JSONLファイルが存在するか確認
   ```bash
   find ~/.claude/projects -name "*.jsonl"
   ```

### 権限エラー

**症状**: `EACCES` や `permission denied` エラーが発生

**解決策**:
```bash
# ディレクトリの権限を確認
ls -la ~/.claude

# 必要に応じて権限を修正
chmod 755 ~/.claude
```

### Windows でパスが認識されない

**解決策**:

```bash
# バックスラッシュを使用
--root C:\Users\username\.claude\projects

# または環境変数を使用
--root %USERPROFILE%\.claude\projects
```

## FAQ

### Q: エンドポイントを指定しないとどうなりますか？

A: メッセージは収集されますが送信はされません。ローカルテスト用に使えます。

### Q: 既存の会話履歴も送信されますか？

A: いいえ。初期スキャンで検出した履歴は読み取り位置だけ更新し、送信はライブ以降のメッセージに限定しています。

### Q: 複数のプレイヤーで同じplayer-idを使えますか？

A: 技術的には可能ですが、推奨しません。各プレイヤーに一意のIDを付けてください。

### Q: バックグラウンドで実行できますか？

A: はい。以下の方法があります：

**Mac/Linux (nohup):**
```bash
nohup npx github:toru0325/vibe-fighter-player \
  -t codex \
  -p player-02 \
  -e https://your-endpoint.com/postMessage \
  -k YOUR_KEY > player.log 2>&1 &
```

**Windows (PowerShell):**
```powershell
Start-Process -NoNewWindow npx "github:your-username/vibe-fighter-player -t codex -p player-02 -e https://your-endpoint.com/postMessage"
```

**PM2 (推奨):**
```bash
npm install -g pm2
pm2 start "npx github:toru0325/vibe-fighter-player -t codex -p player-02 -e https://your-endpoint.com/postMessage"
```

### Q: APIキーはどこで取得できますか？

A: イベント主催者から提供されます。

## セキュリティ

### APIキーの安全な管理

**環境変数を使用**:

```bash
# .envファイルに保存
echo "VIBE_FIGHTER_API_KEY=your-api-key" > ~/.vibe-fighter.env

# 実行時に読み込み
export $(cat ~/.vibe-fighter.env | xargs)
npx github:toru0325/vibe-fighter-player \
  -t codex \
  -p player-02 \
  -k $VIBE_FIGHTER_API_KEY
```

**シェルスクリプトを使用**:

```bash
# start-player.sh
#!/bin/bash
source ~/.vibe-fighter.env
npx github:toru0325/vibe-fighter-player \
  -t codex \
  -p player-02 \
  -k $VIBE_FIGHTER_API_KEY
```

## パフォーマンス

- **メモリ使用量**: 50-100MB（通常時）
- **CPU使用率**: <1%（アイドル時）、5-10%（メッセージ処理時）
- **ネットワーク**: メッセージ1件あたり 1-2KB

## ライセンス

MIT License

## サポート

問題が発生した場合は、以下の情報を添えてIssueを作成してください：

- OS（Windows/Mac/Linux）
- Node.jsバージョン
- エラーメッセージ
- 実行したコマンド
- `--verbose` オプション付きのログ出力

GitHub Issues: https://github.com/your-username/vibe-fighter-player/issues

---

**Happy Coding! 🎮✨**
