import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - ダッシュボード" },
    { name: "description", content: "keruta管理パネルのダッシュボード" },
  ];
};

export default function Index() {
  return (
    <Layout>
      <div className="dashboard">
        <h2>ダッシュボード</h2>
        
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title">最近のタスク</h5>
              </div>
              <div className="card-body">
                <p>最近のタスク情報がここに表示されます。</p>
                <a href="/tasks" className="btn btn-primary">タスク一覧へ</a>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title">クイックリンク</h5>
              </div>
              <div className="card-body">
                <div className="list-group">
                  <a href="/tasks" className="list-group-item list-group-item-action">タスク管理</a>
                  <a href="/documents" className="list-group-item list-group-item-action">ドキュメント管理</a>
                  <a href="/repositories" className="list-group-item list-group-item-action">リポジトリ管理</a>
                  <a href="/kubernetes" className="list-group-item list-group-item-action">Kubernetes設定</a>
                  <a href="/agents" className="list-group-item list-group-item-action">エージェント管理</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">API ドキュメント</h5>
              </div>
              <div className="card-body">
                <p>API ドキュメントへのリンク:</p>
                <a href="/swagger-ui" className="btn btn-secondary" target="_blank">Swagger UI を開く</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}