import { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import GitCommitFailures from "~/components/GitCommitFailures";
import { getTask, deleteTask, getTaskLogs, getTaskLogCount, deleteTaskLogs, pauseTask, resumeTask, createSubTask, getSubTasks } from "~/utils/api";
import { useClient } from "~/components/Client";
import { hasGitCommitFailures } from "~/utils/gitCommitLogs";
import type { Task, TaskLog } from "~/types";
import { formatDate } from "~/utils/dateUtils";

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
      return "bg-secondary";
    case "RUNNING":
      return "bg-warning text-dark";
    case "PAUSED":
      return "bg-info text-dark";
    case "FAILED":
    case "ERROR":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
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
  const [showLogs, setShowLogs] = useState(true);
  const [showGitFailures, setShowGitFailures] = useState(false);
  const [hasGitFailures, setHasGitFailures] = useState(false);
  const [autoUpdateLogs, setAutoUpdateLogs] = useState(true);
  const [subTasks, setSubTasks] = useState<Task[]>([]);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [parentTaskLoading, setParentTaskLoading] = useState(false);
  const [showCreateSubTask, setShowCreateSubTask] = useState(false);
  const [subTaskForm, setSubTaskForm] = useState({
    name: "",
    description: "",
    script: "",
    inheritLogs: false
  });

  // タスクデータを取得
  useEffect(() => {
    const fetchTask = async () => {
      if (clientState.state === "loading") return;

      try {
        setLoading(true);
        const data = await getTask(clientState, taskId!);
        setTask(data);
        setError(null);
        
        // Check for git commit failures
        const gitFailures = await hasGitCommitFailures(clientState, taskId!);
        setHasGitFailures(gitFailures);

        // Fetch subtasks
        try {
          const subTasksData = await getSubTasks(clientState, taskId!);
          setSubTasks(subTasksData);
        } catch (err) {
          console.warn("サブタスクの取得に失敗しました:", err);
        }

        // Fetch parent task if exists
        if (data.parentTaskId) {
          try {
            setParentTaskLoading(true);
            const parentTaskData = await getTask(clientState, data.parentTaskId);
            setParentTask(parentTaskData);
          } catch (err) {
            console.warn("親タスクの取得に失敗しました:", err);
          } finally {
            setParentTaskLoading(false);
          }
        }
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

  // ログの自動更新（autoUpdateLogsがtrueの場合のみ）
  useEffect(() => {
    if (!taskId || !autoUpdateLogs) return;

    const interval = setInterval(() => {
      if (showLogs) {
        fetchLogs();
      }
    }, 2000); // 2秒間隔で更新

    return () => clearInterval(interval);
  }, [taskId, showLogs, logFilter, autoUpdateLogs]);

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

  // タスク一時停止のハンドラ
  const handlePause = async () => {
    if (!task || !taskId) return;
    if (clientState.state === "loading") return;

    try {
      const updatedTask = await pauseTask(clientState, taskId);
      setTask(updatedTask);
    } catch (err) {
      console.error("タスクの一時停止に失敗しました:", err);
    }
  };

  // タスク再開のハンドラ
  const handleResume = async () => {
    if (!task || !taskId) return;
    if (clientState.state === "loading") return;

    try {
      const updatedTask = await resumeTask(clientState, taskId);
      setTask(updatedTask);
    } catch (err) {
      console.error("タスクの再開に失敗しました:", err);
    }
  };

  // サブタスク作成のハンドラ
  const handleCreateSubTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task || !taskId) return;
    if (clientState.state === "loading") return;

    try {
      const newSubTask = await createSubTask(clientState, taskId, {
        name: subTaskForm.name,
        description: subTaskForm.description || undefined,
        script: subTaskForm.script || undefined,
        inheritLogs: subTaskForm.inheritLogs
      });

      setSubTasks([...subTasks, newSubTask]);
      setSubTaskForm({ name: "", description: "", script: "", inheritLogs: false });
      setShowCreateSubTask(false);
    } catch (err) {
      console.error("サブタスクの作成に失敗しました:", err);
    }
  };

  // キーボードショートカットのハンドラ
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      const form = event.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  return (
    <Layout>
      <div className="task-details">
        <h2>タスク詳細</h2>

        {/* ブレッドクラム */}
        <div className="mb-3">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <button className="btn btn-link p-0" onClick={() => navigate("/tasks")}>
                  <i className="bi bi-list-task me-1"></i>タスク一覧
                </button>
              </li>
              {task && parentTask && (
                <li className="breadcrumb-item">
                  <button 
                    className="btn btn-link p-0" 
                    onClick={() => navigate(`/tasks/${parentTask.id}`)}
                  >
                    <i className="bi bi-arrow-up-circle me-1"></i>{parentTask.name}
                  </button>
                </li>
              )}
              <li className="breadcrumb-item active" aria-current="page">
                {task ? task.name : "タスク詳細"}
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex justify-content-between mb-3">
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => navigate("/tasks")}>
              ← タスク一覧に戻る
            </button>
            {task && parentTask && (
              <button className="btn btn-outline-info" onClick={() => navigate(`/tasks/${parentTask.id}`)}>
                ↑ 親タスク「{parentTask.name}」に戻る
              </button>
            )}
          </div>
          <div>
            {task && task.status.toUpperCase() === 'RUNNING' && (
              <button className="btn btn-outline-warning me-2" onClick={handlePause}>
                一時停止
              </button>
            )}
            {task && task.status.toUpperCase() === 'PAUSED' && (
              <button className="btn btn-outline-success me-2" onClick={handleResume}>
                再開
              </button>
            )}
            <button className="btn btn-outline-success me-2" onClick={() => setShowCreateSubTask(!showCreateSubTask)}>
              {showCreateSubTask ? "キャンセル" : "サブタスク作成"}
            </button>
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
                <span>
                  {task.parentTaskId && <span className="text-muted me-2">[サブタスク]</span>}
                  {task.name}
                </span>
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
                        <td>
                          <button
                            className="btn btn-link p-0 text-start"
                            onClick={() => navigate(`/sessions/${task.sessionId}`)}
                            title="セッション詳細を表示"
                          >
                            {task.sessionId}
                          </button>
                        </td>
                      </tr>
                      {task.parentTaskId && (
                        <tr>
                          <th scope="row">親タスク</th>
                          <td>
                            <div className="d-flex align-items-center">
                              <button
                                className="btn btn-link p-0 text-start me-2"
                                onClick={() => navigate(`/tasks/${task.parentTaskId}`)}
                                title="親タスク詳細を表示"
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i>
                                {parentTaskLoading ? (
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                ) : null}
                                {parentTask ? parentTask.name : task.parentTaskId}
                              </button>
                              {parentTask && (
                                <span className={`badge ${getStatusBadgeClass(parentTask.status)} ms-2`}>
                                  {parentTask.status}
                                </span>
                              )}
                            </div>
                            {parentTask && (
                              <small className="text-muted d-block mt-1">
                                進行状況: {parentTask.progress}% | 更新: {formatDate(parentTask.updatedAt)}
                              </small>
                            )}
                          </td>
                        </tr>
                      )}
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

              {/* サブタスク作成フォーム */}
              {showCreateSubTask && (
                <div className="mb-4">
                  <h6>サブタスク作成</h6>
                  <div className="card bg-light">
                    <div className="card-body">
                      <form onSubmit={handleCreateSubTask}>
                        <div className="mb-3">
                          <label htmlFor="subtask-name" className="form-label">タイトル <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            id="subtask-name"
                            value={subTaskForm.name}
                            onChange={(e) => setSubTaskForm({...subTaskForm, name: e.target.value})}
                            onKeyDown={handleKeyDown}
                            placeholder={`${task.name} - サブタスク`}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label htmlFor="subtask-description" className="form-label">説明</label>
                          <textarea
                            className="form-control"
                            id="subtask-description"
                            value={subTaskForm.description}
                            onChange={(e) => setSubTaskForm({...subTaskForm, description: e.target.value})}
                            onKeyDown={handleKeyDown}
                            placeholder={`親タスクからの継承: ${task.description || '説明なし'}`}
                            rows={3}
                          />
                          <small className="form-text text-muted">
                            空の場合、親タスクの説明が継承されます
                          </small>
                        </div>
                        <div className="mb-3">
                          <label htmlFor="subtask-script" className="form-label">スクリプト</label>
                          <textarea
                            className="form-control"
                            id="subtask-script"
                            value={subTaskForm.script}
                            onChange={(e) => setSubTaskForm({...subTaskForm, script: e.target.value})}
                            onKeyDown={handleKeyDown}
                            placeholder={task.script || 'スクリプトなし'}
                            rows={5}
                          />
                          <small className="form-text text-muted">
                            空の場合、親タスクのスクリプトが継承されます
                          </small>
                        </div>
                        <div className="mb-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="inherit-logs"
                              checked={subTaskForm.inheritLogs}
                              onChange={(e) => setSubTaskForm({...subTaskForm, inheritLogs: e.target.checked})}
                            />
                            <label className="form-check-label" htmlFor="inherit-logs">
                              親タスクのログを継承する
                            </label>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> で送信
                          </small>
                          <div>
                            <button type="button" className="btn btn-secondary me-2" onClick={() => setShowCreateSubTask(false)}>
                              キャンセル
                            </button>
                            <button type="submit" className="btn btn-success">
                              サブタスク作成
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* サブタスク一覧 */}
              {subTasks.length > 0 && (
                <div className="mb-4">
                  <h6>サブタスク <span className="badge bg-primary">{subTasks.length}個</span></h6>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>タイトル</th>
                          <th>ステータス</th>
                          <th>進行状況</th>
                          <th>作成日時</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subTasks.map((subTask) => (
                          <tr key={subTask.id}>
                            <td>
                              <button
                                className="btn btn-link p-0 text-start"
                                onClick={() => navigate(`/tasks/${subTask.id}`)}
                                title="サブタスク詳細を表示"
                              >
                                {subTask.name}
                              </button>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(subTask.status)}`}>
                                {subTask.status}
                              </span>
                            </td>
                            <td>
                              <div className="progress" style={{width: '80px', height: '20px'}}>
                                <div
                                  className="progress-bar"
                                  role="progressbar"
                                  style={{width: `${subTask.progress}%`}}
                                  aria-valuenow={subTask.progress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  {subTask.progress}%
                                </div>
                              </div>
                            </td>
                            <td>{formatDate(subTask.createdAt)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/tasks/${subTask.id}`)}
                              >
                                詳細
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasGitFailures && (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">
                      <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                      Git Commit失敗ログ
                    </h6>
                    <button
                      className={`btn btn-sm ${showGitFailures ? "btn-outline-secondary" : "btn-outline-danger"}`}
                      onClick={() => setShowGitFailures(!showGitFailures)}
                    >
                      {showGitFailures ? "Git失敗ログを非表示" : "Git失敗ログを表示"}
                    </button>
                  </div>

                  {showGitFailures && (
                    <GitCommitFailures 
                      sessionId={task.sessionId} 
                      taskId={taskId!} 
                      showHeader={false} 
                    />
                  )}
                </div>
              )}

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">
                    実行ログ
                    {logCount > 0 && <span className="badge bg-primary ms-2">{logCount}件</span>}
                  </h6>
                </div>

                <div>
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
                          className={`btn btn-sm me-2 ${autoUpdateLogs ? "btn-outline-warning" : "btn-outline-success"}`}
                          onClick={() => setAutoUpdateLogs(!autoUpdateLogs)}
                        >
                          {autoUpdateLogs ? "自動更新を停止" : "自動更新を開始"}
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
                        {logs.map((log, index) => (
                          <div key={`${log.id}-${index}`} className="mb-1">
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
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
