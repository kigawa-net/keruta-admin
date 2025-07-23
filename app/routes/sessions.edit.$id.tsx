import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { getSession, updateSession, getTemplateContent, updateTemplateContent } from "~/utils/api";
import { useClient, ClientState } from "~/components/Client";
import { Session, TerraformTemplateConfig } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - セッション編集" },
    { name: "description", content: "セッションを編集します" },
  ];
};

export default function EditSession() {
  const navigate = useNavigate();
  const { id } = useParams();
  const clientState = useClient();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
    enabled: false
  });
  const [varKey, setVarKey] = useState("");
  const [varValue, setVarValue] = useState("");
  
  // Template content state
  const [templateContent, setTemplateContent] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // セッション情報を取得
  const fetchSession = async (clientState: ClientState) => {
    if (clientState.state === "loading" || !id) return;

    try {
      setFetchLoading(true);
      const data = await getSession(clientState, id);
      setSession(data);
      setTags(data.tags || []);
      setMetadata(data.metadata || {});
      
      // Load terraform template configuration if it exists
      if (data.terraformTemplateConfig) {
        setTerraformConfig(data.terraformTemplateConfig);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
      setError(err instanceof Error ? err.message : "セッションの取得に失敗しました。");
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchSession(clientState);
  }, [clientState, id]);

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

  // Template content handlers
  const loadTemplateContent = async () => {
    if (clientState.state === "loading" || !terraformConfig.templatePath) return;
    
    try {
      setTemplateLoading(true);
      setTemplateError(null);
      const mainTfPath = `${terraformConfig.templatePath}/main.tf`;
      const data = await getTemplateContent(clientState, mainTfPath);
      setTemplateContent(data.content);
    } catch (err) {
      console.error("Failed to load template content:", err);
      setTemplateError(err instanceof Error ? err.message : "テンプレートの読み込みに失敗しました。");
    } finally {
      setTemplateLoading(false);
    }
  };

  const saveTemplateContent = async () => {
    if (clientState.state === "loading" || !terraformConfig.templatePath) return;
    
    try {
      setTemplateLoading(true);
      setTemplateError(null);
      const mainTfPath = `${terraformConfig.templatePath}/main.tf`;
      await updateTemplateContent(clientState, mainTfPath, templateContent);
      alert("テンプレートが保存されました。");
    } catch (err) {
      console.error("Failed to save template content:", err);
      setTemplateError(err instanceof Error ? err.message : "テンプレートの保存に失敗しました。");
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    if (showTemplateEditor && terraformConfig.templatePath && !templateContent) {
      loadTemplateContent();
    }
  }, [showTemplateEditor, terraformConfig.templatePath, clientState]);

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading" || !session || !id) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからセッションオブジェクトを作成
    const updatedSession = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      status: formData.get("status") as string,
      tags: tags,
      metadata: metadata,
      templateConfig: terraformConfig.enabled ? {
        templatePath: terraformConfig.templatePath,
        preferredKeywords: [],
        parameters: terraformConfig.variables
      } : undefined,
    };

    try {
      // APIを使用してセッションを更新
      await updateSession(clientState, id, updatedSession);
      // 成功したらセッション一覧ページに戻る
      navigate("/sessions");
    } catch (err) {
      console.error("セッションの更新に失敗しました:", err);
      setError(err instanceof Error ? err.message : "セッションの更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Layout>
        <div className="d-flex justify-content-center align-items-center" style={{minHeight: "200px"}}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="alert alert-danger" role="alert">
          セッションが見つかりませんでした。
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="edit-session">
        <h2>セッション編集</h2>

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
                  defaultValue={session.name}
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
                  defaultValue={session.description || ""}
                  placeholder="セッションの説明を入力してください（任意）"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="status" className="form-label">
                  ステータス
                </label>
                <select className="form-select" id="status" name="status" defaultValue={session.status}>
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
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Editor Section */}
              {terraformConfig.enabled && terraformConfig.templatePath && (
                <div className="mb-3">
                  <label className="form-label">main.tf編集</label>
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h6 className="card-title mb-0">
                        {terraformConfig.templatePath}/main.tf
                        {templateContent && (
                          <small className="text-muted ms-2">
                            ({templateContent.split('\n').length}行, {templateContent.length}文字)
                          </small>
                        )}
                      </h6>
                      <div className="d-flex gap-2">
                        {!showTemplateEditor ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setShowTemplateEditor(true)}
                            disabled={templateLoading}
                          >
                            編集
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={saveTemplateContent}
                              disabled={templateLoading}
                            >
                              {templateLoading ? '保存中...' : '保存'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setShowTemplateEditor(false)}
                              disabled={templateLoading}
                            >
                              閉じる
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {showTemplateEditor && (
                      <div className="card-body p-0">
                        {templateError && (
                          <div className="alert alert-danger m-3 mb-0">
                            {templateError}
                          </div>
                        )}
                        
                        {templateLoading ? (
                          <div className="d-flex justify-content-center align-items-center p-4">
                            <div className="spinner-border" role="status">
                              <span className="visually-hidden">読み込み中...</span>
                            </div>
                          </div>
                        ) : (
                          <textarea
                            value={templateContent}
                            onChange={(e) => setTemplateContent(e.target.value)}
                            className="form-control border-0"
                            style={{
                              minHeight: "400px",
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
                                setTemplateContent(newValue);
                                // カーソル位置を調整
                                setTimeout(() => {
                                  e.currentTarget.setSelectionRange(start + 2, start + 2);
                                });
                              }
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      更新中...
                    </>
                  ) : (
                    "セッション更新"
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