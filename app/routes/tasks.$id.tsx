import { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { apiDelete, apiGet } from "~/utils/api";
import { useClient } from "~/components/Client";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - タスク詳細" },
    { name: "description", content: "タスクの詳細情報を表示します" },
  ];
};

// タスクデータの型定義
interface Task {
  id: string;
  title: string;
  description: string;
  priority: number;
  status: string;
  documents: any[];
  image: string | null;
  namespace: string;
  jobName: string | null;
  podName: string | null;
  additionalEnv: Record<string, string>;
  kubernetesManifest: any | null;
  logs: string | null;
  agentId: string | null;
  repositoryId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ステータスに応じたバッジのスタイルを返す関数
function getStatusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "SUCCESS":
      return "bg-success";
    case "PENDING":
    case "RUNNING":
      return "bg-warning text-dark";
    case "FAILED":
    case "ERROR":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

// 日時のフォーマット関数
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TaskDetails() {
  const navigate = useNavigate();
  const params = useParams();
  const taskId = params.id;
  const clientState = useClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);

  // タスクデータを取得
  useEffect(() => {
    const fetchTask = async () => {
      if (clientState.state === "loading") return;

      try {
        setLoading(true);
        const data = await apiGet<Task>(clientState, `tasks/${taskId}`);
        setTask(data);
        setError(null);
      } catch (err) {
        console.error("タスクの取得に失敗しました:", err);
        setError("タスクの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [clientState, taskId]);

  // タスク削除のハンドラ
  const handleDelete = async () => {
    if (!task) return;

    if (window.confirm(`タスク「${task.title}」を削除してもよろしいですか？`)) {
      try {
        await apiDelete(clientState, `tasks/${taskId}`);
        // 削除成功後、タスク一覧ページに戻る
        navigate("/tasks");
      } catch (err) {
        console.error("タスクの削除に失敗しました:", err);
      }
    }
  };

  // タスク編集ページへの遷移ハンドラ
  const handleEdit = () => {
    navigate(`/tasks/edit/${taskId}`);
  };

  return (
    <Layout>
      <div className="task-details">
        <h2>タスク詳細</h2>

        <div className="d-flex justify-content-between mb-3">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/tasks")}>
            ← タスク一覧に戻る
          </button>
          <div>
            <button className="btn btn-outline-primary me-2" onClick={handleEdit}>
              編集
            </button>
            <button className="btn btn-outline-danger" onClick={handleDelete}>
              削除
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
            <p className="mt-2">タスク情報を読み込んでいます...</p>
          </div>
        )}

        {error && (
          <div className="text-danger mb-3">
            {error}
          </div>
        )}

        {!loading && !error && !task && (
          <div className="text-warning mb-3">
            タスクが見つかりませんでした。
          </div>
        )}

        {!loading && !error && task && (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title d-flex justify-content-between align-items-center">
                <span>{task.title}</span>
                <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                  {task.status}
                </span>
              </h5>
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6>基本情報</h6>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <th scope="row">ID</th>
                        <td>{task.id}</td>
                      </tr>
                      <tr>
                        <th scope="row">優先度</th>
                        <td>
                          {task.priority === 0 && "低"}
                          {task.priority === 1 && "中"}
                          {task.priority === 2 && "高"}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">作成日時</th>
                        <td>{formatDate(task.createdAt)}</td>
                      </tr>
                      <tr>
                        <th scope="row">更新日時</th>
                        <td>{formatDate(task.updatedAt)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6>実行情報</h6>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <th scope="row">ネームスペース</th>
                        <td>{task.namespace || "-"}</td>
                      </tr>
                      <tr>
                        <th scope="row">ジョブ名</th>
                        <td>{task.jobName || "-"}</td>
                      </tr>
                      <tr>
                        <th scope="row">Pod名</th>
                        <td>{task.podName || "-"}</td>
                      </tr>
                      <tr>
                        <th scope="row">エージェントID</th>
                        <td>{task.agentId || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-4">
                <h6>説明</h6>
                <div className="p-3 bg-light rounded">
                  {task.description ? (
                    <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{task.description}</pre>
                  ) : (
                    <p className="text-muted mb-0">説明はありません</p>
                  )}
                </div>
              </div>

              {task.logs && (
                <div className="mb-4">
                  <h6>ログ</h6>
                  <div className="p-3 bg-dark text-light rounded" style={{ maxHeight: "300px", overflow: "auto" }}>
                    <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{task.logs}</pre>
                  </div>
                </div>
              )}

              {task.additionalEnv && Object.keys(task.additionalEnv).length > 0 && (
                <div className="mb-4">
                  <h6>追加環境変数</h6>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>キー</th>
                        <th>値</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(task.additionalEnv).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
