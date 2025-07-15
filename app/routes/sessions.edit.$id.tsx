import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { apiGet, apiPut } from "~/utils/api";
import { useClient, ClientState } from "~/components/Client";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - セッション編集" },
    { name: "description", content: "セッションを編集します" },
  ];
};

// セッションデータの型定義
interface Session {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tags: string[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

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

  // セッション情報を取得
  const fetchSession = async (clientState: ClientState) => {
    if (clientState.state === "loading" || !id) return;

    try {
      setFetchLoading(true);
      const data = await apiGet<Session>(clientState, `sessions/${id}`);
      setSession(data);
      setTags(data.tags || []);
      setMetadata(data.metadata || {});
      setError(null);
    } catch (err) {
      console.error("セッション情報の取得に失敗しました:", err);
      setError("セッション情報の取得に失敗しました。");
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

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading" || !id) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからセッションオブジェクトを作成
    const updatedSession = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      status: formData.get("status") as string || "ACTIVE",
      tags: tags,
      metadata: metadata,
    };

    try {
      // APIを使用してセッションを更新
      await apiPut(clientState, `sessions/${id}`, updatedSession);
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
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
          <p className="mt-2">セッション情報を読み込んでいます...</p>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="alert alert-danger" role="alert">
          セッションが見つかりません。
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
            <h5 className="card-title">セッション情報 (ID: {session.id})</h5>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

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