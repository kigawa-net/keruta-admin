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

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S で保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        const saveButton = form.querySelector('button[name="_action"][value="save"]') as HTMLButtonElement;
        if (saveButton && !saveButton.disabled) {
          saveButton.click();
        }
      }
      // Ctrl+Enter / Cmd+Enter で構文チェック
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        const validateButton = form.querySelector('button[name="_action"][value="validate"]') as HTMLButtonElement;
        if (validateButton && !validateButton.disabled) {
          validateButton.click();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
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
            {'errors' in actionData && actionData.errors && (
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
                  <h5 className="card-title mb-0">
                    main.tf
                    <small className="text-muted ms-2">
                      ({content.split('\n').length}行, {content.length}文字)
                    </small>
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          // フォーマット機能
                          const formatted = content
                            .split('\n')
                            .map((line: string) => line.trim())
                            .map((line: string, index: number, array: string[]) => {
                              // 簡易的なTerraformフォーマット
                              if (line.endsWith('{')) {
                                return line;
                              } else if (line === '}') {
                                return line;
                              } else if (line && !line.startsWith('#') && array[index - 1]?.endsWith('{')) {
                                return '  ' + line;
                              }
                              return line;
                            })
                            .join('\n');
                          setContent(formatted);
                        }}
                        disabled={isSubmitting}
                      >
                        フォーマット
                      </button>
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
                </div>
                <div className="card-body p-0">
                  <textarea
                    name="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="form-control border-0"
                    style={{
                      minHeight: "600px",
                      fontFamily: "'Source Code Pro', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                      fontSize: "14px",
                      resize: "vertical",
                      lineHeight: "1.5",
                      tabSize: 2
                    }}
                    placeholder="Terraformコードを入力してください..."
                    onKeyDown={(e) => {
                      // Tab キーでインデント挿入
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const value = e.currentTarget.value;
                        const newValue = value.substring(0, start) + '  ' + value.substring(end);
                        setContent(newValue);
                        // カーソル位置を調整
                        setTimeout(() => {
                          e.currentTarget.setSelectionRange(start + 2, start + 2);
                        });
                      }
                    }}
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

              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="card-title mb-0">テンプレート挿入</h6>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        const agentTemplate = `
resource "coder_agent" "main" {
  arch                   = data.coder_provisioner.me.arch
  os                     = data.coder_provisioner.me.os
  startup_script_timeout = 180
  startup_script         = <<-EOT
    set -e
    # Install common tools
    sudo apt-get update
    sudo apt-get install -y curl wget git
  EOT

  metadata {
    display_name = "CPU Usage"
    key          = "0_cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }
}`;
                        const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newContent = content.substring(0, start) + agentTemplate + content.substring(end);
                        setContent(newContent);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + agentTemplate.length, start + agentTemplate.length);
                        });
                      }}
                    >
                      Coder Agent
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        const k8sTemplate = `
resource "kubernetes_deployment" "workspace" {
  metadata {
    name      = "coder-\${data.coder_workspace.me.owner}-\${data.coder_workspace.me.name}"
    namespace = data.coder_provisioner.me.tags["namespace"] != "" ? data.coder_provisioner.me.tags["namespace"] : "default"
  }
  
  spec {
    replicas = data.coder_workspace.me.transition == "start" ? 1 : 0
    
    selector {
      match_labels = {
        "app.kubernetes.io/name" = "coder-workspace"
      }
    }
    
    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = "coder-workspace"
        }
      }
      
      spec {
        container {
          name  = "workspace"
          image = "ubuntu:20.04"
          
          resources {
            requests = {
              "cpu"    = "100m"
              "memory" = "512Mi"
            }
            limits = {
              "cpu"    = "1000m"
              "memory" = "2Gi"
            }
          }
        }
      }
    }
  }
}`;
                        const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newContent = content.substring(0, start) + k8sTemplate + content.substring(end);
                        setContent(newContent);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + k8sTemplate.length, start + k8sTemplate.length);
                        });
                      }}
                    >
                      K8s Deployment
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        const pvcTemplate = `
resource "kubernetes_persistent_volume_claim" "workspace" {
  metadata {
    name      = "coder-\${data.coder_workspace.me.owner}-\${data.coder_workspace.me.name}"
    namespace = data.coder_provisioner.me.tags["namespace"] != "" ? data.coder_provisioner.me.tags["namespace"] : "default"
  }
  
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
    storage_class_name = var.storage_class_name
  }
}`;
                        const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newContent = content.substring(0, start) + pvcTemplate + content.substring(end);
                        setContent(newContent);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + pvcTemplate.length, start + pvcTemplate.length);
                        });
                      }}
                    >
                      PVC
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
                      <li>coder_agent - ワークスペース内のエージェント</li>
                      <li>coder_app - Webアプリケーションのポート転送</li>
                      <li>kubernetes_deployment - Kubernetesデプロイメント</li>
                      <li>kubernetes_persistent_volume_claim - 永続ボリューム</li>
                    </ul>
                    
                    <p className="mt-3"><strong>キーボードショートカット：</strong></p>
                    <ul>
                      <li>Ctrl+S / Cmd+S - 保存</li>
                      <li>Ctrl+Enter / Cmd+Enter - 構文チェック</li>
                      <li>Tab - インデント挿入</li>
                    </ul>
                    
                    <p className="mt-3">
                      <a href="https://registry.coder.com/providers/coder/coder" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-decoration-none">
                        Coder Provider ドキュメント ↗
                      </a>
                    </p>
                    <p>
                      <a href="https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-decoration-none">
                        Kubernetes Provider ドキュメント ↗
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