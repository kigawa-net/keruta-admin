# keruta-admin

keruta管理パネルは、タスク・ドキュメント・リポジトリ・Kubernetesリソースを管理するWebインターフェースです。

## 技術スタック
- **フレームワーク**: Remix.js (React)
- **スタイリング**: Bootstrap 5
- **言語**: TypeScript

## 開発方法
### 環境構築
1. 依存関係のインストール
```bash
npm install
```

2. バックエンド設定
バックエンドAPIの接続先は環境変数で設定できます。以下の環境変数が利用可能です：

- `BACKEND_URL`: バックエンドAPIのベースURL（デフォルト: `http://localhost:3001/api`）
- `API_VERSION`: APIバージョン（デフォルト: `v1`）

環境変数は`.env`ファイルまたはシステムの環境変数として設定できます：

```bash
# .envファイルの例
BACKEND_URL=https://api.example.com
API_VERSION=v2
```


3. 開発サーバーの起動
```bash
npm run dev
```

4. ブラウザで http://localhost:3000 にアクセス

## ドキュメント
詳細なドキュメントは [keruta-doc/keruta-admin](./keruta-doc/keruta-admin/README.md) ディレクトリを参照してください。

- [管理パネル機能・画面・操作方法](./keruta-doc/keruta-admin/adminPanel.md)
- [Remix実装について](./keruta-doc/keruta-admin/adminPanelRemix.md)
- [インストールスクリプト作成機能](./keruta-doc/keruta-admin/adminPanelScriptGenerator.md)
- [リポジトリ管理機能](./keruta-doc/keruta-admin/repositoryManagement.md)
