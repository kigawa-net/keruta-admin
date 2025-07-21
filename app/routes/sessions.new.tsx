import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { createSession, getCoderTemplates } from "~/utils/api";
import { useClient } from "~/components/Client";
import { CoderTemplate, SessionTemplateConfig } from "~/types";

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
  
  // Template configuration state
  const [templateConfig, setTemplateConfig] = useState<SessionTemplateConfig>({
    repositoryRef: "main",
    templatePath: "",
    preferredKeywords: [],
    parameters: {}
  });
  const [availableTemplates, setAvailableTemplates] = useState<CoderTemplate[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [paramKey, setParamKey] = useState("");
  const [paramValue, setParamValue] = useState("");

  // Load available templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      if (clientState.state !== "loading") {
        try {
          const templates = await getCoderTemplates(clientState);
          setAvailableTemplates(templates);
        } catch (err) {
          console.error("Failed to load Coder templates:", err);
        }
      }
    };
    loadTemplates();
  }, [clientState]);

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

  // Template configuration handlers
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !templateConfig.preferredKeywords.includes(keywordInput.trim())) {
      setTemplateConfig({
        ...templateConfig,
        preferredKeywords: [...templateConfig.preferredKeywords, keywordInput.trim()]
      });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setTemplateConfig({
      ...templateConfig,
      preferredKeywords: templateConfig.preferredKeywords.filter((_, i) => i !== index)
    });
  };

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
      description: formData.get("description") as string || null,
      status: formData.get("status") as string || "ACTIVE",
      tags: tags,
      metadata: metadata,
      templateConfig: Object.keys(templateConfig.parameters).length > 0 || 
                     templateConfig.templateId || 
                     templateConfig.templateName || 
                     templateConfig.preferredKeywords.length > 0 ||
                     templateConfig.repositoryUrl ||
                     templateConfig.templatePath ? templateConfig : null,
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

              {/* Template Configuration */}
              <div className="mb-3">
                <label className="form-label">Coderテンプレート設定</label>
                <div className="card">
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="templateId" className="form-label">テンプレートID</label>
                        <select
                          className="form-select"
                          id="templateId"
                          value={templateConfig.templateId || ""}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            templateId: e.target.value || undefined
                          })}
                        >
                          <option value="">未指定</option>
                          {availableTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="templateName" className="form-label">テンプレート名</label>
                        <input
                          type="text"
                          className="form-control"
                          id="templateName"
                          placeholder="テンプレート名を指定"
                          value={templateConfig.templateName || ""}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            templateName: e.target.value || undefined
                          })}
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="repositoryUrl" className="form-label">リポジトリURL</label>
                        <input
                          type="text"
                          className="form-control"
                          id="repositoryUrl"
                          placeholder="https://github.com/user/repo"
                          value={templateConfig.repositoryUrl || ""}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            repositoryUrl: e.target.value || undefined
                          })}
                        />
                      </div>
                      <div className="col-md-3">
                        <label htmlFor="repositoryRef" className="form-label">リポジトリRef</label>
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
                      <div className="col-md-3">
                        <label htmlFor="templatePath" className="form-label">テンプレートパス</label>
                        <input
                          type="text"
                          className="form-control"
                          id="templatePath"
                          placeholder="/"
                          value={templateConfig.templatePath}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            templatePath: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    {/* Preferred Keywords */}
                    <div className="mb-3">
                      <label className="form-label">優先キーワード</label>
                      <div className="input-group mb-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="キーワードを入力"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddKeyword();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleAddKeyword}
                        >
                          追加
                        </button>
                      </div>
                      <div className="d-flex flex-wrap">
                        {templateConfig.preferredKeywords.map((keyword, index) => (
                          <span key={index} className="badge bg-primary me-2 mb-2">
                            {keyword}
                            <button
                              type="button"
                              className="btn-close btn-close-white ms-2"
                              aria-label="削除"
                              onClick={() => handleRemoveKeyword(index)}
                              style={{fontSize: "0.7em"}}
                            />
                          </span>
                        ))}
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
                    </div>
                  </div>
                </div>
              </div>

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
