import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { createSession } from "~/utils/api";
import { useClient } from "~/components/Client";
import { TerraformTemplateConfig } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - 新規セッション作成" },
    { name: "description", content: "新しいセッションを作成します" },
  ];
};

export default function NewSession() {
  const navigate = useNavigate();
  const clientState = useClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");
  
  // Terraform template configuration state
  const [terraformConfig, setTerraformConfig] = useState<TerraformTemplateConfig>({
    templatePath: "/terraform-templates/coder-workspace",
    storageClassName: "standard",
    storageSize: "10Gi",
    mountPath: "/home/coder/shared",
    variables: {},
    enabled: false,
    claudeCodeConfig: {
      enabled: true,
      apiKey: "",
      nodeVersion: "20"
    }
  });
  const [varKey, setVarKey] = useState("");
  const [varValue, setVarValue] = useState("");

  // タグ追加ハンドラ
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // タグ削除ハンドラ
  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // メタデータ追加ハンドラ
  const handleAddMetadata = () => {
    if (metadataKey.trim() && metadataValue.trim()) {
      setMetadata({...metadata, [metadataKey.trim()]: metadataValue.trim()});
      setMetadataKey("");
      setMetadataValue("");
    }
  };

  // メタデータ削除ハンドラ
  const handleRemoveMetadata = (key: string) => {
    const newMetadata = {...metadata};
    delete newMetadata[key];
    setMetadata(newMetadata);
  };

  // Terraform template configuration handlers
  const handleAddVariable = () => {
    if (varKey.trim() && varValue.trim()) {
      setTerraformConfig({
        ...terraformConfig,
        variables: {
          ...terraformConfig.variables,
          [varKey.trim()]: varValue.trim()
        }
      });
      setVarKey("");
      setVarValue("");
    }
  };

  const handleRemoveVariable = (key: string) => {
    const newVariables = {...terraformConfig.variables};
    delete newVariables[key];
    setTerraformConfig({
      ...terraformConfig,
      variables: newVariables
    });
  };

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading") return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからセッションオブジェクトを作成
    const session = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      status: formData.get("status") as string || "ACTIVE",
      tags: tags,
      metadata: metadata,
      terraformTemplateConfig: terraformConfig.enabled ? terraformConfig : undefined,
    };

    try {
      // APIを使用してセッションを作成
      await createSession(clientState, session);
      // 成功したらセッション一覧ページに戻る
      navigate("/sessions");
    } catch (err) {
      console.error("セッションの作成に失敗しました:", err);
      setError(err instanceof Error ? err.message : "セッションの作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="new-session">
        <h2>新規セッション作成</h2>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title">セッション情報</h5>
          </div>
          <div className="card-body">

            <Form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  セッション名 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  required
                  placeholder="セッション名を入力してください"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  説明
                </label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="セッションの説明を入力してください（任意）"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="status" className="form-label">
                  ステータス
                </label>
                <select className="form-select" id="status" name="status" defaultValue="ACTIVE">
                  <option value="ACTIVE">アクティブ</option>
                  <option value="INACTIVE">非アクティブ</option>
                  <option value="COMPLETED">完了</option>
                  <option value="ARCHIVED">アーカイブ済み</option>
                </select>
              </div>

              {/* タグ管理 */}
              <div className="mb-3">
                <label className="form-label">タグ</label>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="タグを入力してください"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleAddTag}
                  >
                    追加
                  </button>
                </div>
                <div className="d-flex flex-wrap">
                  {tags.map((tag, index) => (
                    <span key={index} className="badge bg-primary me-2 mb-2">
                      {tag}
                      <button
                        type="button"
                        className="btn-close btn-close-white ms-2"
                        aria-label="削除"
                        onClick={() => handleRemoveTag(index)}
                        style={{fontSize: "0.7em"}}
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* メタデータ管理 */}
              <div className="mb-3">
                <label className="form-label">メタデータ</label>
                <div className="row mb-2">
                  <div className="col-5">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="キー"
                      value={metadataKey}
                      onChange={(e) => setMetadataKey(e.target.value)}
                    />
                  </div>
                  <div className="col-5">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="値"
                      value={metadataValue}
                      onChange={(e) => setMetadataValue(e.target.value)}
                    />
                  </div>
                  <div className="col-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={handleAddMetadata}
                    >
                      追加
                    </button>
                  </div>
                </div>
                <div className="list-group">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{key}:</strong> {value}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveMetadata(key)}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terraform Template Configuration */}
              <div className="mb-3">
                <label className="form-label">Terraformテンプレート設定</label>
                <div className="card">
                  <div className="card-body">
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="terraformEnabled"
                        checked={terraformConfig.enabled}
                        onChange={(e) => setTerraformConfig({
                          ...terraformConfig,
                          enabled: e.target.checked
                        })}
                      />
                      <label className="form-check-label" htmlFor="terraformEnabled">
                        Terraformテンプレートを有効化
                      </label>
                    </div>

                    {terraformConfig.enabled && (
                      <>
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <label htmlFor="terraformTemplatePath" className="form-label">テンプレートパス</label>
                            <input
                              type="text"
                              className="form-control"
                              id="terraformTemplatePath"
                              placeholder="/terraform-templates/coder-workspace"
                              value={terraformConfig.templatePath}
                              onChange={(e) => setTerraformConfig({
                                ...terraformConfig,
                                templatePath: e.target.value
                              })}
                            />
                          </div>
                          <div className="col-md-3">
                            <label htmlFor="storageClassName" className="form-label">ストレージクラス</label>
                            <input
                              type="text"
                              className="form-control"
                              id="storageClassName"
                              placeholder="standard"
                              value={terraformConfig.storageClassName || ""}
                              onChange={(e) => setTerraformConfig({
                                ...terraformConfig,
                                storageClassName: e.target.value || undefined
                              })}
                            />
                          </div>
                          <div className="col-md-3">
                            <label htmlFor="storageSize" className="form-label">ストレージサイズ</label>
                            <input
                              type="text"
                              className="form-control"
                              id="storageSize"
                              placeholder="10Gi"
                              value={terraformConfig.storageSize || ""}
                              onChange={(e) => setTerraformConfig({
                                ...terraformConfig,
                                storageSize: e.target.value || undefined
                              })}
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label htmlFor="mountPath" className="form-label">マウントパス</label>
                          <input
                            type="text"
                            className="form-control"
                            id="mountPath"
                            placeholder="/home/coder/shared"
                            value={terraformConfig.mountPath || ""}
                            onChange={(e) => setTerraformConfig({
                              ...terraformConfig,
                              mountPath: e.target.value || undefined
                            })}
                          />
                        </div>

                        {/* Terraform Variables */}
                        <div className="mb-3">
                          <label className="form-label">Terraform変数</label>
                          <div className="row mb-2">
                            <div className="col-5">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="変数名"
                                value={varKey}
                                onChange={(e) => setVarKey(e.target.value)}
                              />
                            </div>
                            <div className="col-5">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="変数値"
                                value={varValue}
                                onChange={(e) => setVarValue(e.target.value)}
                              />
                            </div>
                            <div className="col-2">
                              <button
                                type="button"
                                className="btn btn-outline-secondary w-100"
                                onClick={handleAddVariable}
                              >
                                追加
                              </button>
                            </div>
                          </div>
                          <div className="list-group">
                            {Object.entries(terraformConfig.variables).map(([key, value]) => (
                              <div key={key} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{key}:</strong> {value}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveVariable(key)}
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Claude Code設定 */}
                        <div className="mb-4">
                          <h6 className="text-muted mb-3">🤖 Claude Code設定</h6>
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="claudeCodeEnabled"
                              checked={terraformConfig.claudeCodeConfig?.enabled || false}
                              onChange={(e) => setTerraformConfig({
                                ...terraformConfig,
                                claudeCodeConfig: {
                                  ...terraformConfig.claudeCodeConfig,
                                  enabled: e.target.checked,
                                  apiKey: terraformConfig.claudeCodeConfig?.apiKey || "",
                                  nodeVersion: terraformConfig.claudeCodeConfig?.nodeVersion || "20"
                                }
                              })}
                            />
                            <label className="form-check-label" htmlFor="claudeCodeEnabled">
                              Claude Codeを有効化（ワークスペースにClaude CLI toolを自動インストール）
                            </label>
                          </div>

                          {terraformConfig.claudeCodeConfig?.enabled && (
                            <>
                              <div className="row mb-3">
                                <div className="col-md-8">
                                  <label htmlFor="claudeApiKey" className="form-label">
                                    Anthropic API Key
                                    <small className="text-muted ms-2">（オプション - 後でユーザーが設定可能）</small>
                                  </label>
                                  <input
                                    type="password"
                                    className="form-control"
                                    id="claudeApiKey"
                                    placeholder="sk-ant-api03-..."
                                    value={terraformConfig.claudeCodeConfig?.apiKey || ""}
                                    onChange={(e) => setTerraformConfig({
                                      ...terraformConfig,
                                      claudeCodeConfig: {
                                        ...terraformConfig.claudeCodeConfig!,
                                        apiKey: e.target.value
                                      }
                                    })}
                                  />
                                  <div className="form-text">
                                    空の場合、ユーザーは `claude-code auth` コマンドで後から設定できます
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <label htmlFor="nodeVersion" className="form-label">Node.js Version</label>
                                  <select
                                    className="form-select"
                                    id="nodeVersion"
                                    value={terraformConfig.claudeCodeConfig?.nodeVersion || "20"}
                                    onChange={(e) => setTerraformConfig({
                                      ...terraformConfig,
                                      claudeCodeConfig: {
                                        ...terraformConfig.claudeCodeConfig!,
                                        nodeVersion: e.target.value
                                      }
                                    })}
                                  >
                                    <option value="18">Node.js 18</option>
                                    <option value="20">Node.js 20</option>
                                    <option value="22">Node.js 22</option>
                                  </select>
                                </div>
                              </div>

                              <div className="alert alert-info">
                                <div className="d-flex align-items-start">
                                  <i className="bi bi-info-circle me-2 mt-1"></i>
                                  <div>
                                    <strong>Claude Code機能:</strong>
                                    <ul className="mb-0 mt-1">
                                      <li>ターミナルでのClaude AI統合</li>
                                      <li>コードベース全体の理解とナビゲーション</li>
                                      <li>VS Code, JetBrains IDEとの統合</li>
                                      <li>コマンドライン: <code>claude-code</code> または <code>cc</code></li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/sessions")}
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      作成中...
                    </>
                  ) : (
                    "セッション作成"
                  )}
                </button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </Layout>
  );
}