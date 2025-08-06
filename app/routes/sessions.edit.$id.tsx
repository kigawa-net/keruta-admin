import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { getSession, updateSession } from "~/utils/api";
import { useClient, ClientState } from "~/components/Client";
import { Session, SessionTemplateConfig } from "~/types";

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
  const [repositoryUrl, setRepositoryUrl] = useState<string>("");
  const [repositoryRef, setRepositoryRef] = useState<string>("main");
  
  // Session template configuration state
  const [templateConfig, setTemplateConfig] = useState<SessionTemplateConfig>({
    templateId: null,
    templateName: null,
    repositoryUrl: null,
    repositoryRef: "main",
    templatePath: ".",
    preferredKeywords: [],
    parameters: {}
  });
  const [paramKey, setParamKey] = useState("");
  const [paramValue, setParamValue] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  

  // セッション情報を取得
  const fetchSession = async (clientState: ClientState) => {
    if (clientState.state === "loading" || !id) return;

    try {
      setFetchLoading(true);
      const data = await getSession(clientState, id);
      setSession(data);
      setTags(data.tags || []);
      setRepositoryUrl(data.repositoryUrl || "");
      setRepositoryRef(data.repositoryRef || "main");
      
      // Load session template configuration if it exists
      if (data.templateConfig) {
        setTemplateConfig(data.templateConfig);
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

  // キーワード追加ハンドラ
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !templateConfig.preferredKeywords.includes(keywordInput.trim())) {
      setTemplateConfig({
        ...templateConfig,
        preferredKeywords: [...templateConfig.preferredKeywords, keywordInput.trim()]
      });
      setKeywordInput("");
    }
  };

  // キーワード削除ハンドラ
  const handleRemoveKeyword = (index: number) => {
    setTemplateConfig({
      ...templateConfig,
      preferredKeywords: templateConfig.preferredKeywords.filter((_, i) => i !== index)
    });
  };

  // パラメータハンドラ
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
      repositoryUrl: repositoryUrl || undefined,
      repositoryRef: repositoryRef,
      templateConfig: templateConfig.templateId || templateConfig.templateName || templateConfig.repositoryUrl || 
                     templateConfig.templatePath !== "." || templateConfig.preferredKeywords.length > 0 || 
                     Object.keys(templateConfig.parameters).length > 0 ? templateConfig : undefined,
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

              {/* リポジトリ情報 */}
              <div className="mb-3">
                <label className="form-label">リポジトリ情報</label>
                <div className="row mb-2">
                  <div className="col-md-8">
                    <label htmlFor="repositoryUrl" className="form-label">リポジトリURL</label>
                    <input
                      type="url"
                      className="form-control"
                      id="repositoryUrl"
                      placeholder="https://github.com/user/repo.git"
                      value={repositoryUrl}
                      onChange={(e) => setRepositoryUrl(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="repositoryRef" className="form-label">ブランチ/タグ</label>
                    <input
                      type="text"
                      className="form-control"
                      id="repositoryRef"
                      placeholder="main"
                      value={repositoryRef}
                      onChange={(e) => setRepositoryRef(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Session Template Configuration */}
              <div className="mb-3">
                <label className="form-label">テンプレート設定</label>
                <div className="card">
                  <div className="card-body">

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="templateId" className="form-label">テンプレーID</label>
                        <input
                          type="text"
                          className="form-control"
                          id="templateId"
                          placeholder="ubuntu-basic"
                          value={templateConfig.templateId || ""}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            templateId: e.target.value || null
                          })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="templateName" className="form-label">テンプレート名</label>
                        <input
                          type="text"
                          className="form-control"
                          id="templateName"
                          placeholder="Ubuntu Basic"
                          value={templateConfig.templateName || ""}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            templateName: e.target.value || null
                          })}
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-8">
                        <label htmlFor="templateRepositoryUrl" className="form-label">テンプレートリポジトリURL</label>
                        <input
                          type="url"
                          className="form-control"
                          id="templateRepositoryUrl"
                          placeholder="https://github.com/user/template-repo.git"
                          value={templateConfig.repositoryUrl || ""}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            repositoryUrl: e.target.value || null
                          })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label htmlFor="templateRepositoryRef" className="form-label">テンプレートブランチ</label>
                        <input
                          type="text"
                          className="form-control"
                          id="templateRepositoryRef"
                          placeholder="main"
                          value={templateConfig.repositoryRef}
                          onChange={(e) => setTemplateConfig({
                            ...templateConfig,
                            repositoryRef: e.target.value
                          })}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="templatePath" className="form-label">テンプレートパス</label>
                      <input
                        type="text"
                        className="form-control"
                        id="templatePath"
                        placeholder="."
                        value={templateConfig.templatePath}
                        onChange={(e) => setTemplateConfig({
                          ...templateConfig,
                          templatePath: e.target.value
                        })}
                      />
                    </div>

                    {/* Preferred Keywords */}
                    <div className="mb-3">
                      <label className="form-label">優先キーワード</label>
                      <div className="input-group mb-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="キーワードを入力してください"
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
                          <span key={index} className="badge bg-secondary me-2 mb-2">
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