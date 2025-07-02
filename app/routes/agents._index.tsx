import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - エージェント管理" },
    { name: "description", content: "エージェントの一覧・詳細・新規作成・編集・削除" },
  ];
};

export default function Agents() {
  return (
    <Layout>
      <div className="agents">
        <h2>エージェント管理</h2>
        
        <div className="d-flex justify-content-between mb-3">
          <div>
            <button className="btn btn-primary me-2">新規エージェント登録</button>
            <button className="btn btn-outline-secondary">更新</button>
          </div>
          <div className="d-flex">
            <input 
              type="text" 
              className="form-control me-2" 
              placeholder="エージェント検索..." 
              aria-label="エージェント検索"
            />
            <button className="btn btn-outline-secondary">検索</button>
          </div>
        </div>
        
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title">エージェント一覧</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>名前</th>
                    <th>タイプ</th>
                    <th>ステータス</th>
                    <th>最終実行</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>ビルドエージェント</td>
                    <td>ビルド</td>
                    <td><span className="badge bg-success">アクティブ</span></td>
                    <td>2023-01-01 10:00:00</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1">詳細</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>テストエージェント</td>
                    <td>テスト</td>
                    <td><span className="badge bg-warning text-dark">待機中</span></td>
                    <td>2023-01-02 09:00:00</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1">詳細</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>デプロイエージェント</td>
                    <td>デプロイ</td>
                    <td><span className="badge bg-danger">エラー</span></td>
                    <td>2023-01-03 14:00:00</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1">詳細</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">インストールスクリプト設定</h5>
          </div>
          <div className="card-body">
            <p>エージェントのインストールスクリプトを管理画面から設定できます。</p>
            
            <div className="mb-3">
              <label htmlFor="agentInstallScript" className="form-label">インストールスクリプト</label>
              <textarea 
                className="form-control" 
                id="agentInstallScript" 
                rows={10}
                defaultValue={`#!/bin/bash

# エージェントインストールスクリプト
echo "エージェントのインストールを開始します..."

# 依存関係のインストール
apt-get update
apt-get install -y curl wget

# エージェントのダウンロードと設定
curl -L https://example.com/agent/download | bash

# 環境変数の設定
export KERUTA_TASK_ID=\${KERUTA_TASK_ID}
export KERUTA_AGENT_KEY=\${KERUTA_AGENT_KEY}

echo "エージェントのインストールが完了しました！"
`}
              ></textarea>
            </div>
            
            <div className="mb-3">
              <label htmlFor="agentEnvVars" className="form-label">利用可能な環境変数</label>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>変数名</th>
                      <th>説明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>KERUTA_TASK_ID</code></td>
                      <td>実行中のタスクID</td>
                    </tr>
                    <tr>
                      <td><code>KERUTA_AGENT_KEY</code></td>
                      <td>エージェント認証キー</td>
                    </tr>
                    <tr>
                      <td><code>KERUTA_API_URL</code></td>
                      <td>Keruta API URL</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <button className="btn btn-primary me-2">保存</button>
              <button className="btn btn-outline-secondary">リセット</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}