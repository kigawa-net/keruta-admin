import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - ドキュメント管理" },
    { name: "description", content: "ドキュメントの一覧・新規作成・編集・削除・タグ付け・検索" },
  ];
};

export default function Documents() {
  return (
    <Layout>
      <div className="documents">
        <h2>ドキュメント管理</h2>
        
        <div className="d-flex justify-content-between mb-3">
          <div>
            <button className="btn btn-primary me-2">新規ドキュメント作成</button>
            <button className="btn btn-outline-secondary">更新</button>
          </div>
          <div className="d-flex">
            <input 
              type="text" 
              className="form-control me-2" 
              placeholder="ドキュメント検索..." 
              aria-label="ドキュメント検索"
            />
            <button className="btn btn-outline-secondary">検索</button>
          </div>
        </div>
        
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">フィルター</h5>
              </div>
              <div className="card-body">
                <h6>タグ</h6>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" value="" id="tagTechnical" />
                  <label className="form-check-label" htmlFor="tagTechnical">
                    技術文書
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" value="" id="tagOperation" />
                  <label className="form-check-label" htmlFor="tagOperation">
                    運用マニュアル
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" value="" id="tagApi" />
                  <label className="form-check-label" htmlFor="tagApi">
                    API仕様
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" value="" id="tagGuide" />
                  <label className="form-check-label" htmlFor="tagGuide">
                    ユーザーガイド
                  </label>
                </div>
                
                <hr />
                
                <h6>更新日</h6>
                <div className="mb-3">
                  <select className="form-select">
                    <option selected>すべての期間</option>
                    <option value="1">今日</option>
                    <option value="2">過去7日間</option>
                    <option value="3">過去30日間</option>
                    <option value="4">過去90日間</option>
                  </select>
                </div>
                
                <button className="btn btn-primary w-100">フィルター適用</button>
              </div>
            </div>
          </div>
          
          <div className="col-md-9">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">ドキュメント一覧</h5>
              </div>
              <div className="card-body">
                <div className="list-group">
                  <div className="list-group-item list-group-item-action">
                    <div className="d-flex w-100 justify-content-between">
                      <h5 className="mb-1">APIサーバー仕様書</h5>
                      <small>2023-01-01</small>
                    </div>
                    <p className="mb-1">kerutaシステムのAPIサーバー仕様についてのドキュメント</p>
                    <div>
                      <span className="badge bg-info me-1">API仕様</span>
                      <span className="badge bg-secondary me-1">技術文書</span>
                    </div>
                    <div className="mt-2">
                      <button className="btn btn-sm btn-outline-primary me-1">閲覧</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </div>
                  </div>
                  
                  <div className="list-group-item list-group-item-action">
                    <div className="d-flex w-100 justify-content-between">
                      <h5 className="mb-1">管理パネル操作マニュアル</h5>
                      <small>2023-01-15</small>
                    </div>
                    <p className="mb-1">管理パネルの操作方法についての詳細なマニュアル</p>
                    <div>
                      <span className="badge bg-success me-1">ユーザーガイド</span>
                      <span className="badge bg-warning text-dark me-1">運用マニュアル</span>
                    </div>
                    <div className="mt-2">
                      <button className="btn btn-sm btn-outline-primary me-1">閲覧</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </div>
                  </div>
                  
                  <div className="list-group-item list-group-item-action">
                    <div className="d-flex w-100 justify-content-between">
                      <h5 className="mb-1">Kubernetes連携仕様</h5>
                      <small>2023-02-10</small>
                    </div>
                    <p className="mb-1">kerutaシステムとKubernetesの連携仕様についてのドキュメント</p>
                    <div>
                      <span className="badge bg-secondary me-1">技術文書</span>
                      <span className="badge bg-primary me-1">Kubernetes</span>
                    </div>
                    <div className="mt-2">
                      <button className="btn btn-sm btn-outline-primary me-1">閲覧</button>
                      <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                      <button className="btn btn-sm btn-outline-danger">削除</button>
                    </div>
                  </div>
                </div>
                
                <nav aria-label="ドキュメント一覧ページネーション" className="mt-3">
                  <ul className="pagination justify-content-center">
                    <li className="page-item disabled">
                      <a className="page-link" href="#" tabIndex={-1} aria-disabled="true">前へ</a>
                    </li>
                    <li className="page-item active"><a className="page-link" href="#">1</a></li>
                    <li className="page-item"><a className="page-link" href="#">2</a></li>
                    <li className="page-item"><a className="page-link" href="#">3</a></li>
                    <li className="page-item">
                      <a className="page-link" href="#">次へ</a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}