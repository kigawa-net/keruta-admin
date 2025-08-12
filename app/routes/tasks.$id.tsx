import { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { getTask, deleteTask, getTaskLogs, getTaskLogCount, deleteTaskLogs } from "~/utils/api";
import { useClient } from "~/components/Client";
import type { Task, TaskLog } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - タスク詳細" },
    { name: "description", content: "タスクの詳細情報を表示します" },
  ];
};

// ログレベルのスタイルを返す関数
function getLogLevelClass(level: string): string {
  switch (level.toUpperCase()) {
    case "ERROR":
    case "FATAL":
      return "text-danger fw-bold";
    case "WARN":
      return "text-warning fw-bold";
    case "INFO":
      return "text-info";
    case "DEBUG":
      return "text-muted";
    default:
      return "text-dark";
  }
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
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [logCount, setLogCount] = useState<number>(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>("");
  const [showLogs, setShowLogs] = useState(false);

  // タスクデータを取得
  useEffect(() => {
    const fetchTask = async () => {
      if (clientState.state === "loading") return;

      try {
        setLoading(true);
        const data = await getTask(clientState, taskId!);
        setTask(data);
        setError(null);
      } catch (err) {
        console.error("タスクの取得に失敗しました:", err);
        setError("タスクの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchTask();
    }
  }, [clientState, taskId]);

  // ログ情報を取得
  const fetchLogs = async () => {
    if (!taskId || clientState.state === "loading") return;

    try {
      setLogsLoading(true);
      
      const filters = logFilter ? { level: logFilter } : undefined;
      const logsData = await getTaskLogs(clientState, taskId, filters);
      const countData = await getTaskLogCount(clientState, taskId);
      
      setLogs(logsData);
      setLogCount(countData.count);
      setLogsError(null);
    } catch (err) {
      console.error("ログの取得に失敗しました:", err);
      setLogsError("ログの取得に失敗しました。");
    } finally {
      setLogsLoading(false);
    }
  };

  // ログ表示が有効になったときにログを取得
  useEffect(() => {
    if (showLogs && taskId) {
      fetchLogs();
    }
  }, [showLogs, taskId, logFilter]);

  // タスク削除のハンドラ
  const handleDelete = async () => {
    if (!task) return;
    if (clientState.state === "loading") return;

    if (window.confirm(`タスク「${task.name}」を削除してもよろしいですか？`)) {
      try {
        await deleteTask(clientState, taskId!);
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
                <span>{task.name}</span>
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
                        <th scope="row">進行状況</th>
                        <td>
                          <div className="progress">
                            <div 
                              className="progress-bar" 
                              role="progressbar" 
                              style={{width: `${task.progress}%`}}
                              aria-valuenow={task.progress} 
                              aria-valuemin={0} 
                              aria-valuemax={100}
                            >
                              {task.progress}%
                            </div>
                          </div>
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
                        <th scope="row">セッションID</th>
                        <td>{task.sessionId}</td>
                      </tr>
                      <tr>
                        <th scope="row">メッセージ</th>
                        <td>{task.message || "-"}</td>
                      </tr>
                      <tr>
                        <th scope="row">エラーコード</th>
                        <td>{task.errorCode || "-"}</td>
                      </tr>
                      <tr>
                        <th scope="row">パラメータ</th>
                        <td>
                          {Object.keys(task.parameters).length > 0 
                            ? Object.keys(task.parameters).length + "個"
                            : "-"
                          }
                        </td>
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

              {task.script && (
                <div className="mb-4">
                  <h6>スクリプト</h6>
                  <div className="p-3 bg-light rounded">
                    <pre className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{task.script}</pre>
                  </div>
                </div>
              )}

              {Object.keys(task.parameters).length > 0 && (
                <div className="mb-4">
                  <h6>パラメータ</h6>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>キー</th>
                        <th>値</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(task.parameters).map(([key, value]) => (
                        <tr key={key}>
                          <td>{key}</td>
                          <td>{JSON.stringify(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">
                    実行ログ 
                    {logCount > 0 && <span className="badge bg-primary ms-2">{logCount}件</span>}
                  </h6>
                  <button
                    className={`btn btn-sm ${showLogs ? "btn-outline-secondary" : "btn-outline-primary"}`}
                    onClick={() => setShowLogs(!showLogs)}
                  >
                    {showLogs ? "ログを非表示" : "ログを表示"}
                  </button>
                </div>

                {showLogs && (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <select
                          className="form-select form-select-sm"
                          value={logFilter}
                          onChange={(e) => setLogFilter(e.target.value)}
                        >
                          <option value="">全てのレベル</option>
                          <option value="DEBUG">DEBUG</option>
                          <option value="INFO">INFO</option>
                          <option value="WARN">WARN</option>
                          <option value="ERROR">ERROR</option>
                          <option value="FATAL">FATAL</option>
                        </select>
                      </div>
                      <div className="col-md-8">
                        <button
                          className="btn btn-sm btn-outline-secondary me-2"
                          onClick={fetchLogs}
                          disabled={logsLoading}
                        >
                          {logsLoading ? "更新中..." : "ログ更新"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={async () => {
                            if (window.confirm("このタスクの全ログを削除してもよろしいですか？")) {
                              try {
                                await deleteTaskLogs(clientState, taskId!);
                                setLogs([]);
                                setLogCount(0);
                              } catch (err) {
                                console.error("ログの削除に失敗しました:", err);
                              }
                            }
                          }}
                        >
                          ログ削除
                        </button>
                      </div>
                    </div>

                    {logsLoading && (
                      <div className="text-center my-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">ログ読み込み中...</span>
                        </div>
                      </div>
                    )}

                    {logsError && (
                      <div className="text-danger mb-3">
                        {logsError}
                      </div>
                    )}

                    {!logsLoading && !logsError && logs.length === 0 && (
                      <div className="text-muted p-3 text-center">
                        ログがありません
                      </div>
                    )}

                    {!logsLoading && !logsError && logs.length > 0 && (
                      <div className="bg-dark text-light p-3 rounded" style={{ maxHeight: "400px", overflow: "auto" }}>
                        {logs.map((log) => (
                          <div key={log.id} className="mb-1">
                            <span className="text-muted me-2">
                              {formatDate(log.timestamp)}
                            </span>
                            <span className={`me-2 ${getLogLevelClass(log.level)}`}>
                              [{log.level}]
                            </span>
                            <span className="text-info me-2">
                              ({log.source})
                            </span>
                            <span style={{ whiteSpace: "pre-wrap" }}>
                              {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
