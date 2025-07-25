import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { createSession, getTemplates } from "~/utils/api";
import { useClient } from "~/components/Client";
import { Template, SessionTemplateConfig } from "~/types";

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
  
  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateLoading, setTemplateLoading] = useState(false);
  
  // Session template configuration state
  const [templateConfig, setTemplateConfig] = useState<SessionTemplateConfig>({
    templateId: null,
    templateName: null,
    repositoryUrl: null,
    repositoryRef: "main",
    templatePath: "/terraform-templates/coder-workspace",
    preferredKeywords: [],
    parameters: {
      storage_class_name: "standard",
      storage_size: "10Gi",
      mount_path: "/home/coder/shared",
      claude_code_enabled: "true",
      claude_api_key: "",
      node_version: "20"
    }
  });
  const [paramKey, setParamKey] = useState("");
  const [paramValue, setParamValue] = useState("");

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

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      if (clientState.state !== "loaded") return;
      
      try {
        setTemplateLoading(true);
        const templatesData = await getTemplates(clientState);
        setTemplates(templatesData);
        
        // Set default template if available
        const defaultTemplate = templatesData.find(t => t.status === "active");
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setTemplateConfig(prev => ({
            ...prev,
            templateId: defaultTemplate.id,
            templateName: defaultTemplate.name,
            templatePath: defaultTemplate.path
          }));
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setTemplateLoading(false);
      }
    };
    
    loadTemplates();
  }, [clientState]);

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplateId(templateId);
    
    if (template) {
      setTemplateConfig(prev => ({
        ...prev,
        templateId: template.id,
        templateName: template.name,
        templatePath: template.path
      }));
    }
  };

  // Template parameter handlers
  const handleAddParameter = () => {
    if (paramKey.trim() && paramValue.trim()) {
      setTemplateConfig({
        ...templateConfig,
        parameters: {
          ...templateConfig.parameters,
          [paramKey.trim()]: paramValue.trim()
        }
      });
      setParamKey("");
      setParamValue("");
    }
  };

  const handleRemoveParameter = (key: string) => {
    const newParameters = {...templateConfig.parameters};
    delete newParameters[key];
    setTemplateConfig({
      ...templateConfig,
      parameters: newParameters
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
      templateConfig: selectedTemplateId ? templateConfig : undefined,
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

              {/* Template Selection */}
              <div className="mb-3">
                <label className="form-label">ワークスペーステンプレート選択</label>
                <div className="card">
                  <div className="card-body">
                    {templateLoading ? (
                      <div className="d-flex justify-content-center p-3">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">読み込み中...</span>
                        </div>
                        <span className="ms-2">テンプレートを読み込み中...</span>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3">
                          <label htmlFor="templateSelect" className="form-label">
                            テンプレート <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            id="templateSelect"
                            value={selectedTemplateId}
                            onChange={(e) => handleTemplateSelect(e.target.value)}
                            required
                          >
                            <option value="">テンプレートを選択してください</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} - {template.description}
                              </option>
                            ))}
                          </select>
                          {templates.length === 0 && (
                            <div className="form-text text-warning">
                              利用可能なテンプレートがありません。管理者にお問い合わせください。
                            </div>
                          )}
                        </div>

                        {selectedTemplateId && (
                          <>
                            <div className="alert alert-info mb-3">
                              <div className="d-flex align-items-center">
                                <i className="bi bi-info-circle me-2"></i>
                                <div>
                                  <strong>選択されたテンプレート:</strong> {templateConfig.templateName}<br/>
                                  <small className="text-muted">パス: {templateConfig.templatePath}</small>
                                </div>
                              </div>
                            </div>

                            <div className="row mb-3">
                              <div className="col-md-6">
                                <label htmlFor="repositoryRef" className="form-label">リポジトリ参照</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  id="repositoryRef"
                                  placeholder="main"
                                  value={templateConfig.repositoryRef}
                                  onChange={(e) => setTemplateConfig({
                                    ...templateConfig,
                                    repositoryRef: e.target.value
                                  })}
                                />
                              </div>
                              <div className="col-md-6">
                                <label htmlFor="repositoryUrl" className="form-label">リポジトリURL（オプション）</label>
                                <input
                                  type="url"
                                  className="form-control"
                                  id="repositoryUrl"
                                  placeholder="https://github.com/your-org/templates"
                                  value={templateConfig.repositoryUrl || ""}
                                  onChange={(e) => setTemplateConfig({
                                    ...templateConfig,
                                    repositoryUrl: e.target.value || null
                                  })}
                                />
                              </div>
                            </div>

                            {/* Template Parameters */}
                            <div className="mb-3">
                              <label className="form-label">テンプレートパラメータ</label>
                              <div className="row mb-2">
                                <div className="col-5">
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="パラメータ名"
                                    value={paramKey}
                                    onChange={(e) => setParamKey(e.target.value)}
                                  />
                                </div>
                                <div className="col-5">
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="パラメータ値"
                                    value={paramValue}
                                    onChange={(e) => setParamValue(e.target.value)}
                                  />
                                </div>
                                <div className="col-2">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary w-100"
                                    onClick={handleAddParameter}
                                  >
                                    追加
                                  </button>
                                </div>
                              </div>
                              <div className="list-group">
                                {Object.entries(templateConfig.parameters).map(([key, value]) => (
                                  <div key={key} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                      <strong>{key}:</strong> {value}
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleRemoveParameter(key)}
                                    >
                                      削除
                                    </button>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Common parameters info */}
                              <div className="mt-3">
                                <div className="alert alert-light">
                                  <div className="d-flex align-items-start">
                                    <i className="bi bi-lightbulb me-2 mt-1"></i>
                                    <div>
                                      <strong>よく使用されるパラメータ:</strong>
                                      <ul className="mb-0 mt-1 small">
                                        <li><code>storage_class_name</code>: ストレージクラス (例: standard)</li>
                                        <li><code>storage_size</code>: ストレージサイズ (例: 10Gi)</li>
                                        <li><code>mount_path</code>: マウントパス (例: /home/coder/shared)</li>
                                        <li><code>claude_code_enabled</code>: Claude Code有効化 (true/false)</li>
                                        <li><code>claude_api_key</code>: Claude API キー</li>
                                        <li><code>node_version</code>: Node.js バージョン (18/20/22)</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
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