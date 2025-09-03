import { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Form, useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { apiGet, updateTask } from "~/utils/api";
import { useClient } from "~/components/Client";
import { Task } from "~/types/index";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - タスク編集" },
    { name: "description", content: "既存のタスクを編集します" },
  ];
};

export default function EditTask() {
  const navigate = useNavigate();
  const params = useParams();
  const taskId = params.id;
  const clientState = useClient();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);

  // タスクデータを取得
  useEffect(() => {
    const fetchTask = async () => {
      if (clientState.state === "loading") return;

      try {
        setFetchLoading(true);
        const data = await apiGet<Task>(clientState, `tasks/${taskId}`);
        setTask(data);
        setError(null);
      } catch (err) {
        console.error("タスクの取得に失敗しました:", err);
        setError("タスクの取得に失敗しました。");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchTask();
  }, [clientState, taskId]);

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading") return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからタスクオブジェクトを作成
    const updatedTask = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      script: formData.get("script") as string,
      // 必要に応じて他のフィールドを追加
    };

    try {
      // APIを使用してタスクを更新
      await updateTask(clientState, taskId, updatedTask);
      // 成功したらタスク一覧ページに戻る
      navigate("/tasks");
    } catch (err) {
      console.error("タスクの更新に失敗しました:", err);
      setError(err instanceof Error ? err.message : "タスクの更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="edit-task">
        <h2>タスク編集</h2>

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

            {fetchLoading ? (
              <div className="text-center my-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
                <p className="mt-2">タスク情報を読み込んでいます...</p>
              </div>
            ) : task ? (
              <Form method="post" onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">名前</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    required
                    defaultValue={task.name}
                    placeholder="タスクの名前を入力"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">説明</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows={3}
                    defaultValue={task.description}
                    placeholder="タスクの説明を入力"
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label htmlFor="script" className="form-label">スクリプト</label>
                  <textarea
                    className="form-control"
                    id="script"
                    name="script"
                    rows={5}
                    defaultValue={task.script}
                    placeholder="実行するスクリプトを入力"
                  ></textarea>
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
                        更新中...
                      </>
                    ) : (
                      "タスクを更新"
                    )}
                  </button>
                </div>
              </Form>
            ) : (
              <div className="text-warning mb-3">
                タスクが見つかりませんでした。
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
