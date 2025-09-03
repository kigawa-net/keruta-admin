# リアルタイム更新システム

このドキュメントでは、keruta管理パネルのリアルタイム更新機能について説明します。

## 概要

管理パネルは Server-Sent Events (SSE) を使用してリアルタイムでデータを更新します。これにより、複数のユーザーが同時に管理パネルを使用している際にも、最新の状態が自動的に反映されます。

## 機能

### 自動更新される項目

1. **セッション管理**
   - セッション作成/更新/削除の即座反映
   - ステータス変更の自動更新
   - Terraformテンプレートの変更通知

2. **タスク管理**
   - タスク作成/更新/削除の即座反映
   - 実行状態の変更通知
   - ログの自動更新

3. **ダッシュボード**
   - 統計情報の自動更新
   - リアルタイムアクティビティの表示
   - システム状態の監視

### 接続状態インジケーター

各ページの右上にリアルタイム接続状態が表示されます：
- 🟢 **接続中**: リアルタイム更新が有効
- 🔴 **切断**: 接続に問題があります

## 技術的詳細

### アーキテクチャ

```
Frontend (React/Remix) <-- SSE --> Backend API
```

### 主要コンポーネント

1. **useManagementSSE Hook** (`app/hooks/useManagementSSE.ts`)
   - SSE接続の管理
   - イベントの受信と処理
   - 自動再接続機能

2. **RealtimeProvider** (`app/contexts/RealtimeContext.tsx`)
   - グローバルな接続状態管理
   - イベントの配信
   - 接続状態の共有

3. **RealtimeIndicator** (`app/components/RealtimeIndicator.tsx`)
   - 接続状態の視覚表示
   - 最終更新時刻の表示

### サポートされるイベントタイプ

- `session_update`: セッション情報の更新
- `session_created`: 新しいセッションの作成
- `session_deleted`: セッションの削除
- `task_update`: タスク情報の更新
- `task_created`: 新しいタスクの作成
- `task_deleted`: タスクの削除
- `log_created`: 新しいログエントリ
- `system_update`: システム状態の変更

## バックエンド実装要件

リアルタイム更新を有効にするには、バックエンドで以下のエンドポイントを実装する必要があります：

### 必須エンドポイント

```
GET /api/v1/management/realtime
```

このエンドポイントはSSEストリームを提供し、以下の形式でイベントを送信する必要があります：

```javascript
// イベントの例
event: session_update
data: {
  "type": "session_update",
  "entityId": "session-123",
  "data": {
    "id": "session-123",
    "name": "Updated Session",
    "status": "ACTIVE",
    // その他のセッションデータ
  },
  "timestamp": 1640995200000
}
```

### エラーハンドリング

- 接続が失敗した場合、自動的に再接続を試行します
- 最大5回まで再接続を試行し、失敗した場合はエラー状態を表示します
- 再接続間隔は3秒です

## 使用方法

### 新しいページでリアルタイム更新を追加する場合

1. `useManagementSSE` フックを使用：

```typescript
import { useManagementSSE } from "~/hooks/useManagementSSE";

// コンポーネント内で
const { connected, error } = useManagementSSE({
  clientState,
  onSessionUpdate: (data) => {
    // セッション更新の処理
  },
  onTaskUpdate: (data) => {
    // タスク更新の処理
  }
});
```

2. `RealtimeIndicator` を追加：

```typescript
import RealtimeIndicator from "~/components/RealtimeIndicator";

// JSX内で
<RealtimeIndicator showStatus={true} />
```

### カスタムイベントの追加

新しいイベントタイプを追加する場合：

1. `ManagementSSEEvent` の `type` に新しいイベントタイプを追加
2. `useManagementSSE` に対応するハンドラーを追加
3. バックエンドで対応するイベントの送信を実装

## トラブルシューティング

### 接続が切断される場合

1. バックエンドのSSEエンドポイントが正常に動作していることを確認
2. ネットワーク接続を確認
3. ブラウザの開発者ツールでコンソールエラーを確認

### 更新が反映されない場合

1. イベントタイプが正しく実装されていることを確認
2. バックエンドがイベントを正しく送信していることを確認
3. フロントエンドのイベントハンドラーが正しく実装されていることを確認

## パフォーマンス考慮事項

- イベントは最大100件まで保持され、古いものから自動的に削除されます
- 不要な再レンダリングを避けるため、useCallbackとuseMemoを適切に使用しています
- 接続が不安定な場合の自動再接続により、ユーザー体験を向上させています