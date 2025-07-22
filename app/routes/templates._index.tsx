import type { MetaFunction } from "@remix-run/node";
import { useState, useEffect } from "react";
import Layout from "~/components/Layout";
import { defaultFetchOptions } from "~/utils/apiConfig";

export const meta: MetaFunction = () => {
  return [
    { title: "テンプレート管理 - keruta管理パネル" },
    { name: "description", content: "Coderテンプレートの管理" },
  ];
};

interface Template {
  id: string;
  name: string;
  description: string;
  path: string;
  lastModified: string;
  status: "active" | "draft" | "error";
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/v1/templates', defaultFetchOptions);
        if (response.ok) {
          const templatesData = await response.json();
          setTemplates(templatesData);
        } else {
          console.error('Failed to fetch templates:', response.statusText);
          // フォールバックデータ
          setTemplates([
            {
              id: "coder-workspace",
              name: "Coder Workspace",
              description: "標準的なワークスペーステンプレート",
              path: "/terraform-templates/coder-workspace/main.tf",
              lastModified: "2024-01-15 10:30:00",
              status: "active"
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        // エラー時のフォールバック
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const getStatusBadge = (status: Template["status"]) => {
    const badgeClass = {
      active: "bg-success",
      draft: "bg-warning",
      error: "bg-danger"
    }[status];

    const statusText = {
      active: "アクティブ",
      draft: "下書き",
      error: "エラー"
    }[status];

    return <span className={`badge ${badgeClass}`}>{statusText}</span>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>テンプレート管理</h2>
          <div>
            <button className="btn btn-outline-secondary me-2">
              テンプレートをインポート
            </button>
            <a href="/templates/new" className="btn btn-primary">
              新規テンプレート作成
            </a>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="alert alert-info">
            <h5>テンプレートが見つかりません</h5>
            <p>新しいテンプレートを作成するか、既存のテンプレートをインポートしてください。</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">テンプレート一覧</h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>名前</th>
                    <th>説明</th>
                    <th>パス</th>
                    <th>最終更新</th>
                    <th>状態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td>
                        <strong>{template.name}</strong>
                      </td>
                      <td>{template.description}</td>
                      <td>
                        <code className="small">{template.path}</code>
                      </td>
                      <td className="small text-muted">
                        {template.lastModified}
                      </td>
                      <td>
                        {getStatusBadge(template.status)}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <a 
                            href={`/templates/edit/${template.id}`}
                            className="btn btn-outline-primary"
                          >
                            編集
                          </a>
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              // TODO: テンプレートの複製機能
                              alert("複製機能は未実装です");
                            }}
                          >
                            複製
                          </button>
                          <button 
                            className="btn btn-outline-success"
                            onClick={() => {
                              // TODO: Coderへの登録機能
                              alert("Coderへの登録機能は未実装です");
                            }}
                          >
                            Coderに登録
                          </button>
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => {
                              if (window.confirm(`テンプレート「${template.name}」を削除しますか？`)) {
                                // TODO: 削除機能
                                alert("削除機能は未実装です");
                              }
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Coderテンプレート統計</h6>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-4">
                    <div className="h4 text-success">1</div>
                    <div className="small text-muted">アクティブ</div>
                  </div>
                  <div className="col-4">
                    <div className="h4 text-warning">0</div>
                    <div className="small text-muted">下書き</div>
                  </div>
                  <div className="col-4">
                    <div className="h4 text-danger">0</div>
                    <div className="small text-muted">エラー</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">クイックアクション</h6>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <a href="/templates/examples" className="btn btn-outline-info btn-sm">
                    テンプレート例を参照
                  </a>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      // TODO: テンプレートの検証機能
                      alert("検証機能は未実装です");
                    }}
                  >
                    全テンプレートを検証
                  </button>
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      // TODO: Coderサーバーとの同期機能
                      alert("同期機能は未実装です");
                    }}
                  >
                    Coderと同期
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}