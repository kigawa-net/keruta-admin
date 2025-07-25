import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => {
  return [
    { title: "新規テンプレート作成 - keruta管理パネル" },
    { name: "description", content: "新しいCoderテンプレートの作成" },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action");
  
  try {
    if (action === "create") {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const content = formData.get("content") as string;
      
      if (!name || !content) {
        return json({ 
          success: false, 
          message: "テンプレート名とコンテンツは必須項目です" 
        });
      }
      
      const response = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/v1/templates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, content })
        }
      );
      
      if (response.ok) {
        const template = await response.json();
        return redirect(`/templates/edit/${template.id}`);
      } else {
        const error = await response.text();
        return json({ 
          success: false, 
          message: `作成に失敗しました: ${error}` 
        });
      }
    }
    
    if (action === "validate") {
      const content = formData.get("content") as string;
      
      if (!content.trim()) {
        return json({ 
          success: false, 
          message: "構文チェックするコンテンツがありません" 
        });
      }
      
      const response = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/v1/templates/validate`,
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

export default function TemplateNew() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(`# 新しいCoderテンプレート
# このテンプレートは新しいワークスペースの作成に使用されます

terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
    }
  }
}

# データソース
data "coder_provisioner" "me" {
}

data "coder_workspace" "me" {
}

# 変数定義
variable "use_kubeconfig" {
  type        = bool
  sensitive   = true
  description = "Use host kubeconfig? (true/false)"
  default     = false
}

variable "storage_class_name" {
  type        = string
  description = "Storage class name for PVC"
  default     = "standard"
}

# Coder Agent
resource "coder_agent" "main" {
  arch                   = data.coder_provisioner.me.arch
  os                     = data.coder_provisioner.me.os
  startup_script_timeout = 180
  startup_script         = <<-EOT
    set -e
    
    # システムアップデート
    sudo apt-get update
    
    # 基本ツールのインストール
    sudo apt-get install -y \\
      curl \\
      wget \\
      git \\
      vim \\
      htop \\
      tree \\
      unzip
    
    # Coderエージェントの準備完了
    echo "Workspace is ready!"
  EOT

  # メタデータ
  metadata {
    display_name = "CPU Usage"
    key          = "0_cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "RAM Usage"
    key          = "1_ram_usage"
    script       = "coder stat mem"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "Home Disk"
    key          = "3_home_disk"
    script       = "coder stat disk --path $HOME"
    interval     = 60
    timeout      = 1
  }
}

# TODO: Kubernetesリソースの定義を追加
# - Deployment
# - Service
# - PersistentVolumeClaim
# など
`);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    const hasContent = name.trim() || description.trim() || content.trim();
    setUnsavedChanges(hasContent);
  }, [name, description, content]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S で作成
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        const createButton = form.querySelector('button[name="_action"][value="create"]') as HTMLButtonElement;
        if (createButton && !createButton.disabled) {
          createButton.click();
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
            <h2>新規テンプレート作成</h2>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/templates">テンプレート</a>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  新規作成
                </li>
              </ol>
            </nav>
          </div>
          <div className="d-flex gap-2">
            {unsavedChanges && (
              <span className="badge bg-info align-self-center">編集中</span>
            )}
            <a href="/templates" className="btn btn-outline-secondary">
              キャンセル
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
            {'warnings' in actionData && actionData.warnings && actionData.warnings.length > 0 && (
              <div className="mt-2">
                <strong>警告:</strong>
                <ul className="mb-0 mt-1">
                  {actionData.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
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
                        value="create"
                        className="btn btn-primary"
                        disabled={isSubmitting || !name.trim() || !content.trim()}
                      >
                        {isSubmitting ? '作成中...' : 'テンプレート作成'}
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
                    <label htmlFor="name" className="form-label">
                      テンプレート名 <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例: ubuntu-development"
                      required
                    />
                    <div className="form-text">
                      英数字、ハイフン、アンダースコアが使用できます
                    </div>
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
                      placeholder="このテンプレートの用途や特徴を説明してください..."
                    />
                  </div>
                  <div className="alert alert-info small">
                    <strong>💡 ヒント:</strong><br />
                    作成後、編集画面でより詳細な設定が可能です。
                  </div>
                </div>
              </div>

              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="card-title mb-0">テンプレート例</h6>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        setName("ubuntu-basic");
                        setDescription("基本的なUbuntuワークスペース");
                        setContent(`terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
    }
  }
}

data "coder_provisioner" "me" {
}

data "coder_workspace" "me" {
}

resource "coder_agent" "main" {
  arch                   = data.coder_provisioner.me.arch
  os                     = data.coder_provisioner.me.os
  startup_script_timeout = 180
  startup_script         = <<-EOT
    set -e
    sudo apt-get update
    sudo apt-get install -y curl wget git vim
    echo "Ubuntu workspace is ready!"
  EOT

  metadata {
    display_name = "CPU Usage"
    key          = "cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }
}`);
                      }}
                    >
                      Ubuntu Basic
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        setName("nodejs-development");
                        setDescription("Node.js開発環境");
                        setContent(`terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
    }
  }
}

data "coder_provisioner" "me" {
}

data "coder_workspace" "me" {
}

resource "coder_agent" "main" {
  arch                   = data.coder_provisioner.me.arch
  os                     = data.coder_provisioner.me.os
  startup_script_timeout = 300
  startup_script         = <<-EOT
    set -e
    
    # システムアップデート
    sudo apt-get update
    
    # Node.js LTS のインストール
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # 開発ツールのインストール
    sudo apt-get install -y git vim curl wget
    sudo npm install -g yarn pnpm
    
    echo "Node.js development environment is ready!"
    node --version
    npm --version
  EOT

  metadata {
    display_name = "CPU Usage"
    key          = "cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "Node Version"
    key          = "node_version"
    script       = "node --version"
    interval     = 600
    timeout      = 1
  }
}

resource "coder_app" "code-server" {
  agent_id     = coder_agent.main.id
  slug         = "code-server"
  display_name = "VS Code"
  url          = "http://localhost:8080/?folder=/home/coder"
  icon         = "/icon/code.svg"
  subdomain    = false
  share        = "owner"

  healthcheck {
    url       = "http://localhost:8080/healthz"
    interval  = 5
    threshold = 6
  }
}`);
                      }}
                    >
                      Node.js Development
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => {
                        setName("python-datascience");
                        setDescription("Python データサイエンス環境");
                        setContent(`terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
    }
  }
}

data "coder_provisioner" "me" {
}

data "coder_workspace" "me" {
}

resource "coder_agent" "main" {
  arch                   = data.coder_provisioner.me.arch
  os                     = data.coder_provisioner.me.os
  startup_script_timeout = 600
  startup_script         = <<-EOT
    set -e
    
    # システムアップデート
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip git vim curl wget
    
    # データサイエンス用パッケージのインストール
    pip3 install --user numpy pandas matplotlib seaborn jupyter notebook scikit-learn
    
    echo "Python Data Science environment is ready!"
    python3 --version
    pip3 --version
  EOT

  metadata {
    display_name = "CPU Usage"
    key          = "cpu_usage"
    script       = "coder stat cpu"
    interval     = 10
    timeout      = 1
  }

  metadata {
    display_name = "Python Version"
    key          = "python_version"
    script       = "python3 --version"
    interval     = 600
    timeout      = 1
  }
}

resource "coder_app" "jupyter" {
  agent_id     = coder_agent.main.id
  slug         = "jupyter"
  display_name = "Jupyter Notebook"
  url          = "http://localhost:8888"
  icon         = "/icon/jupyter.svg"
  subdomain    = false
  share        = "owner"

  healthcheck {
    url       = "http://localhost:8888"
    interval  = 5
    threshold = 6
  }
}`);
                      }}
                    >
                      Python Data Science
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
                    <p><strong>キーボードショートカット:</strong></p>
                    <ul>
                      <li>Ctrl+S / Cmd+S - テンプレート作成</li>
                      <li>Ctrl+Enter / Cmd+Enter - 構文チェック</li>
                      <li>Tab - インデント挿入</li>
                    </ul>
                    
                    <p className="mt-3"><strong>リソース例:</strong></p>
                    <ul>
                      <li><code>coder_agent</code> - ワークスペース内のエージェント</li>
                      <li><code>coder_app</code> - Webアプリのポート転送</li>
                      <li><code>kubernetes_deployment</code> - K8sデプロイメント</li>
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