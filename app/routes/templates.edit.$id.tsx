import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "テンプレート編集 - keruta管理パネル" },
    { name: "description", content: "Coderテンプレートの編集" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  
  try {
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8080'}/api/v1/templates/${id}`);
    
    if (response.ok) {
      const template = await response.json();
      return json({ template });
    } else if (response.status === 404) {
      throw new Response("Template not found", { status: 404 });
    } else {
      throw new Response("Failed to load template", { status: 500 });
    }
  } catch (error) {
    console.error("Error loading template:", error);
    throw new Response("Failed to load template", { status: 500 });
  }
}

export async function action({ request, params }: LoaderFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");
  const { id } = params;
  
  try {
    if (action === "save") {
      const content = formData.get("content") as string;
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      
      const response = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/v1/templates/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, name, description })
        }
      );
      
      if (response.ok) {
        return json({ success: true, message: "テンプレートが保存されました" });
      } else {
        return json({ success: false, message: "保存に失敗しました" });
      }
    }
    
    if (action === "validate") {
      const content = formData.get("content") as string;
      
      const response = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/v1/templates/${id}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        return json({ 
          success: result.isValid, 
          message: result.isValid ? "構文チェックが完了しました" : "構文エラーが見つかりました",
          errors: result.errors,
          warnings: result.warnings
        });
      } else {
        return json({ success: false, message: "構文チェックに失敗しました" });
      }
    }
    
    return json({ success: false, message: "不明なアクションです" });
  } catch (error) {
    console.error("Action error:", error);
    return json({ success: false, message: "サーバーエラーが発生しました" });
  }
}

export default function TemplateEdit() {
  const { template } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const [content, setContent] = useState(template.content);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    const originalContent = template.content;
    const originalName = template.name;
    const originalDescription = template.description;
    
    const hasChanges = content !== originalContent || 
                      name !== originalName || 
                      description !== originalDescription;
    setUnsavedChanges(hasChanges);
  }, [content, name, description, template]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  return (
    <Layout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>テンプレート編集</h2>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/templates">テンプレート</a>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {template.name}
                </li>
              </ol>
            </nav>
          </div>
          <div className="d-flex gap-2">
            {unsavedChanges && (
              <span className="badge bg-warning align-self-center">未保存</span>
            )}
            <a href="/templates" className="btn btn-outline-secondary">
              戻る
            </a>
          </div>
        </div>

        {actionData && (
          <div className={`alert ${actionData.success ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
            {actionData.message}
            {actionData.errors && (
              <ul className="mb-0 mt-2">
                {actionData.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
            <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
          </div>
        )}

        <Form method="post">
          <div className="row">
            <div className="col-md-8">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">main.tf</h5>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="submit"
                      name="_action"
                      value="validate"
                      className="btn btn-outline-info"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '検証中...' : '構文チェック'}
                    </button>
                    <button
                      type="submit"
                      name="_action"
                      value="save"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
                <div className="card-body p-0">
                  <textarea
                    name="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="form-control border-0"
                    style={{
                      minHeight: "600px",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      resize: "vertical"
                    }}
                    placeholder="Terraformコードを入力してください..."
                  />
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="card-title mb-0">基本設定</h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">テンプレート名</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">説明</label>
                    <textarea
                      id="description"
                      name="description"
                      className="form-control"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">パス</label>
                    <input
                      type="text"
                      className="form-control"
                      value={template.path}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">最終更新</label>
                    <input
                      type="text"
                      className="form-control"
                      value={template.lastModified}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="card-title mb-0">アクション</h6>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <button 
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => {
                        // TODO: Coderへの登録機能
                        alert("Coderへの登録機能は未実装です");
                      }}
                    >
                      Coderに登録
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-info btn-sm"
                      onClick={() => {
                        // TODO: プレビュー機能
                        alert("プレビュー機能は未実装です");
                      }}
                    >
                      プレビュー
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        // TODO: 履歴機能
                        alert("履歴機能は未実装です");
                      }}
                    >
                      変更履歴
                    </button>
                    <hr />
                    <button 
                      type="button"
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => {
                        if (window.confirm('未保存の変更が失われます。本当に元に戻しますか？')) {
                          setContent(template.content);
                          setName(template.name);
                          setDescription(template.description);
                        }
                      }}
                    >
                      変更を破棄
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">ヘルプ</h6>
                </div>
                <div className="card-body">
                  <div className="small text-muted">
                    <p><strong>Terraformリソース例：</strong></p>
                    <ul>
                      <li>coder_agent</li>
                      <li>coder_app</li>
                      <li>kubernetes_deployment</li>
                      <li>kubernetes_persistent_volume_claim</li>
                    </ul>
                    <p className="mt-3">
                      <a href="https://registry.coder.com/providers/coder/coder" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-decoration-none">
                        Coder Provider ドキュメント ↗
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </Layout>
  );
}