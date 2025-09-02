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
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title">最近のタスク</h5>
              </div>
              <div className="card-body d-flex flex-column">
                <p className="flex-grow-1">最近のタスク情報がここに表示されます。</p>
                <a href="/tasks" className="btn btn-primary">タスク一覧へ</a>
              </div>
            </div>
          </div>
          
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title">クイックリンク</h5>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/tasks" className="btn btn-outline-primary w-100 py-3">
                      <div>タスク管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/sessions" className="btn btn-outline-primary w-100 py-3">
                      <div>セッション管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/documents" className="btn btn-outline-primary w-100 py-3">
                      <div>ドキュメント管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/repositories" className="btn btn-outline-primary w-100 py-3">
                      <div>リポジトリ管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/templates" className="btn btn-outline-primary w-100 py-3">
                      <div>テンプレート管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/kubernetes" className="btn btn-outline-primary w-100 py-3">
                      <div>Kubernetes設定</div>
                    </a>
                  </div>
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