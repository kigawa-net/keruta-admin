import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - リポジトリ管理" },
    { name: "description", content: "リポジトリの一覧・詳細・新規作成・編集・削除・インストールスクリプト管理" },
  ];
};

export default function Repositories() {
  return (
    <Layout>
      <div className="repositories">
        <h2>リポジトリ管理</h2>
        
        <div className="d-flex justify-content-between mb-3">
          <div>
            <button className="btn btn-primary me-2">新規リポジトリ登録</button>
            <button className="btn btn-outline-secondary">更新</button>
          </div>
          <div className="d-flex">
            <input 
              type="text" 
              className="form-control me-2" 
              placeholder="リポジトリ検索..." 
              aria-label="リポジトリ検索"
            />
            <button className="btn btn-outline-secondary">検索</button>
          </div>
        </div>
        
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title">リポジトリ一覧</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>名前</th>
                    <th>URL</th>
                    <th>ブランチ</th>
                    <th>認証タイプ</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>サンプルリポジトリ1</td>
                    <td>https://github.com/example/repo1.git</td>
                    <td>main</td>
                    <td>SSH</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1">詳細</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-info me-1">スクリプト</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>サンプルリポジトリ2</td>
                    <td>https://github.com/example/repo2.git</td>
                    <td>develop</td>
                    <td>ユーザー名/パスワード</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1">詳細</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-info me-1">スクリプト</button>
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
            <h5 className="card-title">インストールスクリプト生成機能</h5>
          </div>
          <div className="card-body">
            <p>リポジトリごとのインストールスクリプトを視覚的に作成・編集できます。</p>
            
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="card-title">テンプレート選択</h6>
                  </div>
                  <div className="card-body">
                    <select className="form-select mb-3">
                      <option selected>テンプレートを選択...</option>
                      <option value="nodejs">Node.js</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="go">Go</option>
                    </select>
                    <button className="btn btn-primary">テンプレート適用</button>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="card-title">スクリプト操作</h6>
                  </div>
                  <div className="card-body">
                    <button className="btn btn-success me-2">保存</button>
                    <button className="btn btn-info me-2">テスト実行</button>
                    <button className="btn btn-outline-secondary">履歴表示</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header d-flex justify-content-between">
                <h6 className="card-title">スクリプトエディタ</h6>
                <div>
                  <span className="badge bg-success me-2">構文チェック: OK</span>
                </div>
              </div>
              <div className="card-body">
                <div className="border p-3 bg-light" style={{ minHeight: "300px", fontFamily: "monospace" }}>
                  <pre>#!/bin/bash

# サンプルインストールスクリプト
echo "リポジトリのインストールを開始します..."

# 依存関係のインストール
npm install

# ビルド
npm run build

echo "インストールが完了しました！"
exit 0</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}