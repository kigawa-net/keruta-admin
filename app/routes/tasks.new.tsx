import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { apiPost, apiGet } from "~/utils/api";
import { useClient } from "~/components/Client";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - 新規タスク作成" },
    { name: "description", content: "新しいタスクを作成します" },
  ];
};

interface Session {
  id: string;
  name: string;
  status: string;
}

export default function NewTask() {
  const navigate = useNavigate();
  const clientState = useClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // セッション一覧を取得
  const fetchSessions = async () => {
    if (clientState.state === "loading") return;
    
    try {
      setSessionsLoading(true);
      const data = await apiGet<Session[]>(clientState, "sessions");
      setSessions(data);
    } catch (err) {
      console.error("セッション一覧の取得に失敗しました:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [clientState]);

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading") return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからタスクオブジェクトを作成
    const task = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: parseInt(formData.get("priority") as string) || 0,
      session: formData.get("session") as string,
      // 必要に応じて他のフィールドを追加
    };

    try {
      // APIを使用してタスクを作成
      await apiPost(clientState, "tasks", task);
      // 成功したらタスク一覧ページに戻る
      navigate("/tasks");
    } catch (err) {
      console.error("タスクの作成に失敗しました:", err);
      setError(err instanceof Error ? err.message : "タスクの作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="new-task">
        <h2>新規タスク作成</h2>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title">タスク情報</h5>
          </div>
          <div className="card-body">
            {error && (
              <div className="text-danger mb-3">
                {error}
              </div>
            )}

            <Form method="post" onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="title" className="form-label">タイトル</label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  name="title"
                  required
                  placeholder="タスクのタイトルを入力"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label">説明</label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="タスクの説明を入力"
                ></textarea>
              </div>

              <div className="mb-3">
                <label htmlFor="priority" className="form-label">優先度</label>
                <select className="form-select" id="priority" name="priority" defaultValue="1">
                  <option value="0">低</option>
                  <option value="1">中</option>
                  <option value="2">高</option>
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="session" className="form-label">セッション <span className="text-danger">*</span></label>
                <select className="form-select" id="session" name="session" required>
                  <option value="">セッションを選択してください</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} ({session.status})
                    </option>
                  ))}
                </select>
                {sessionsLoading && <div className="form-text">セッションを読み込み中...</div>}
              </div>

              <div className="d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/tasks")}
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
                    "タスクを作成"
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
