import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import SessionLogs from "~/components/sessions/SessionLogs";
import GitCommitFailures from "~/components/GitCommitFailures";
import Pagination from "~/components/Pagination";
import { getSession, deleteSession, apiGet, createTask, getWorkspaces, startWorkspace, stopWorkspace } from "~/utils/api";
import { useClient, ClientState } from "~/components/Client";
import { Session, Workspace, Task } from "~/types";
import { formatDate } from "~/utils/dateUtils";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - セッション詳細" },
    { name: "description", content: "セッションの詳細情報を表示します" },
  ];
};

// Remove local Session interface - using the one from types
// Remove local Task interface - using the one from types

// ステータスに応じたバッジのスタイルを返す関数
function getStatusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "bg-success";
    case "ACTIVE":
      return "bg-primary";
    case "INACTIVE":
      return "bg-warning text-dark";
    case "ARCHIVED":
      return "bg-secondary";
    case "PENDING":
    case "RUNNING":
      return "bg-info";
    case "FAILED":
    case "ERROR":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}


export default function SessionDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const clientState = useClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // タスク作成フォーム関連の状態
  const [taskFormData, setTaskFormData] = useState({
    name: "",
    description: "",
    script: ""
  });
  const [taskCreating, setTaskCreating] = useState(false);

  // タスクのページング関連の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 1ページあたりの表示件数

  // セッション情報を取得
  const fetchSession = async (clientState: ClientState) => {
    if (clientState.state === "loading" || !id) return;

    try {
      setLoading(true);
      const data = await getSession(clientState, id);
      setSession(data);
      setError(null);
    } catch (err) {
      console.error("セッション情報の取得に失敗しました:", err);
      setError("セッション情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // セッションに関連するタスクを取得
  const fetchSessionTasks = async (clientState: ClientState) => {
    if (clientState.state === "loading" || !id) return;

    try {
      setTasksLoading(true);
      const data = await apiGet<Task[]>(clientState, `tasks/session/${id}`);
      setTasks(data.reverse());
    } catch (err) {
      console.error("関連タスクの取得に失敗しました:", err);
      // タスクの取得に失敗してもエラーにはしない（セッション情報は表示する）
    } finally {
      setTasksLoading(false);
    }
  };

  // セッションに関連するワークスペースを取得
  const fetchSessionWorkspaces = async (clientState: ClientState) => {
    if (clientState.state === "loading" || !id) return;

    try {
      setWorkspacesLoading(true);
      const data = await getWorkspaces(clientState, id);
      setWorkspaces(data);
    } catch (err) {
      console.error("関連ワークスペースの取得に失敗しました:", err);
      // ワークスペースの取得に失敗してもエラーにはしない
    } finally {
      setWorkspacesLoading(false);
    }
  };

  useEffect(() => {
    fetchSession(clientState);
    fetchSessionTasks(clientState);
    fetchSessionWorkspaces(clientState);
  }, [clientState, id]);

  // 同期ボタンハンドラ
  const handleSync = async () => {
    if (clientState.state === "loading" || !id) return;

    try {
      setSyncing(true);
      // セッション情報とワークスペース情報を再取得
      await fetchSession(clientState);
      await fetchSessionWorkspaces(clientState);
      await fetchSessionTasks(clientState);
    } catch (err) {
      console.error("同期に失敗しました:", err);
      setError("同期に失敗しました。");
    } finally {
      setSyncing(false);
    }
  };

  // ワークスペース開始ハンドラ
  const handleStartWorkspace = async (workspaceId: string) => {
    if (clientState.state === "loading") return;

    try {
      await startWorkspace(clientState, workspaceId);
      await fetchSessionWorkspaces(clientState);
    } catch (err) {
      console.error("ワークスペースの開始に失敗しました:", err);
      setError("ワークスペースの開始に失敗しました。");
    }
  };

  // ワークスペース停止ハンドラ
  const handleStopWorkspace = async (workspaceId: string) => {
    if (clientState.state === "loading") return;

    try {
      await stopWorkspace(clientState, workspaceId);
      await fetchSessionWorkspaces(clientState);
    } catch (err) {
      console.error("ワークスペースの停止に失敗しました:", err);
      setError("ワークスペースの停止に失敗しました。");
    }
  };

  // セッション削除ハンドラ
  const handleDelete = async () => {
    if (clientState.state === "loading" || !session) return;

    if (window.confirm(`セッション「${session.name}」を削除してもよろしいですか？`)) {
      try {
        await deleteSession(clientState, session.id);
        navigate("/sessions");
      } catch (err) {
        console.error("セッションの削除に失敗しました:", err);
        setError("セッションの削除に失敗しました。");
      }
    }
  };

  // タスク作成ハンドラ
  const handleCreateTask = async () => {
    if (clientState.state === "loading" || !id || taskCreating) return;

    // フォームバリデーション
    if (!taskFormData.name.trim()) {
      alert("タスク名を入力してください。");
      return;
    }

    try {
      setTaskCreating(true);
      await createTask(clientState, {
        sessionId: id,
        name: taskFormData.name,
        description: taskFormData.description,
        script: taskFormData.script
      });

      // フォームをリセット
      setTaskFormData({
        name: "",
        description: "",
        script: ""
      });

      // タスク一覧を再取得
      await fetchSessionTasks(clientState);

      // 新しいタスクが作成されたら1ページ目に戻る
      setCurrentPage(1);
    } catch (err) {
      console.error("タスクの作成に失敗しました:", err);
      setError("タスクの作成に失敗しました。");
    } finally {
      setTaskCreating(false);
    }
  };

  // タスク作成フォームのリセットハンドラ
  const handleResetTaskForm = () => {
    setTaskFormData({
      name: "",
      description: "",
      script: ""
    });
  };

  // キーボードイベントハンドラ（Ctrl+Enter または Cmd+Enter でタスク作成）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!taskCreating && taskFormData.name.trim()) {
        handleCreateTask();
      }
    }
  };

  // ページング関連のロジック
  const totalPages = Math.ceil(tasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = tasks.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // タスク一覧が変更されたときに現在のページを調整
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [tasks.length, totalPages, currentPage]);

  if (loading) {
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

  if (error || !session) {
    return (
      <Layout>
        <p className="text-muted">
          {error || "セッションが見つかりません。"}
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="session-details">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h2>セッション詳細</h2>
          <div>
            <button
              className="btn btn-success me-2"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  同期中...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  同期
                </>
              )}
            </button>
            <button
              className="btn btn-outline-secondary me-2"
              onClick={() => navigate("/sessions")}
            >
              一覧に戻る
            </button>
            <button
              className="btn btn-outline-primary me-2"
              onClick={() => navigate(`/sessions/edit/${session.id}`)}
            >
              編集
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={handleDelete}
            >
              削除
            </button>
          </div>
        </div>

        {/* セッション基本情報 */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title">基本情報</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <th scope="row" style={{width: "30%"}}>ID:</th>
                      <td>{session.id}</td>
                    </tr>
                    <tr>
                      <th scope="row">名前:</th>
                      <td>{session.name}</td>
                    </tr>
                    <tr>
                      <th scope="row">説明:</th>
                      <td>{session.description || "なし"}</td>
                    </tr>
                    <tr>
                      <th scope="row">ステータス:</th>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <th scope="row" style={{width: "30%"}}>作成日時:</th>
                      <td>{formatDate(session.createdAt)}</td>
                    </tr>
                    <tr>
                      <th scope="row">更新日時:</th>
                      <td>{formatDate(session.updatedAt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* タグ情報 */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title">タグ</h5>
          </div>
          <div className="card-body">
            {session.tags.length > 0 ? (
              <div className="d-flex flex-wrap">
                {session.tags.map((tag, index) => (
                  <span key={index} className="badge bg-primary me-2 mb-2">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted">タグはありません。</p>
            )}
          </div>
        </div>


        {/* Terraform Template Configuration */}
        {session.terraformTemplateConfig && (
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title">Terraformテンプレート設定</h5>
              {session.terraformTemplateConfig.enabled && session.terraformTemplateConfig.templatePath && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate(`/sessions/edit/${session.id}#template-editor`)}
                  title="セッション編集画面でmain.tfを編集"
                >
                  <i className="bi bi-pencil me-1"></i>
                  main.tf編集
                </button>
              )}
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <table className="table table-borderless">
                    <tbody>
                      <tr>
                        <th scope="row" style={{width: "40%"}}>有効:</th>
                        <td>
                          <span className={`badge ${session.terraformTemplateConfig.enabled ? 'bg-success' : 'bg-secondary'}`}>
                            {session.terraformTemplateConfig.enabled ? '有効' : '無効'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">テンプレートパス:</th>
                        <td><code>{session.terraformTemplateConfig.templatePath}</code></td>
                      </tr>
                      {session.terraformTemplateConfig.storageClassName && (
                        <tr>
                          <th scope="row">ストレージクラス:</th>
                          <td><code>{session.terraformTemplateConfig.storageClassName}</code></td>
                        </tr>
                      )}
                      {session.terraformTemplateConfig.storageSize && (
                        <tr>
                          <th scope="row">ストレージサイズ:</th>
                          <td><code>{session.terraformTemplateConfig.storageSize}</code></td>
                        </tr>
                      )}
                      {session.terraformTemplateConfig.mountPath && (
                        <tr>
                          <th scope="row">マウントパス:</th>
                          <td><code>{session.terraformTemplateConfig.mountPath}</code></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  {/* Terraform Variables */}
                  <div className="mb-3">
                    <h6>Terraform変数</h6>
                    {Object.keys(session.terraformTemplateConfig.variables).length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm table-striped">
                          <thead>
                            <tr>
                              <th>変数名</th>
                              <th>値</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(session.terraformTemplateConfig.variables).map(([key, value]) => (
                              <tr key={key}>
                                <td><code>{key}</code></td>
                                <td>{value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted">なし</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ワークスペース情報 */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title">ワークスペース</h5>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => fetchSessionWorkspaces(clientState)}
              disabled={workspacesLoading}
            >
              {workspacesLoading ? "読み込み中..." : "更新"}
            </button>
          </div>
          <div className="card-body">
            {workspacesLoading ? (
              <div className="text-center">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
                <span className="ms-2">ワークスペース情報を読み込んでいます...</span>
              </div>
            ) : workspaces.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>名前</th>
                      <th>ステータス</th>
                      <th>URL</th>
                      <th>自動更新</th>
                      <th>TTL</th>
                      <th>作成日時</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaces.map((workspace) => (
                      <tr key={workspace.id}>
                        <td>{workspace.id}</td>
                        <td>{workspace.name}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(workspace.status)}`}>
                            {workspace.status}
                          </span>
                        </td>
                        <td>
                          {workspace.accessUrl ? (
                            <a href={workspace.accessUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                              開く
                            </a>
                          ) : (
                            <span className="text-muted">未設定</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${workspace.autoStart ? 'bg-success' : 'bg-secondary'}`}>
                            {workspace.autoStart ? '有効' : '無効'}
                          </span>
                        </td>
                        <td>{Math.round(workspace.ttlMs / 1000 / 60)} 分</td>
                        <td>{formatDate(workspace.createdAt)}</td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            {workspace.status === 'STOPPED' || workspace.status === 'PENDING' ? (
                              <button
                                className="btn btn-outline-success"
                                onClick={() => handleStartWorkspace(workspace.id)}
                                title="ワークスペースを開始"
                              >
                                <i className="bi bi-play-fill"></i>
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline-warning"
                                onClick={() => handleStopWorkspace(workspace.id)}
                                title="ワークスペースを停止"
                              >
                                <i className="bi bi-stop-fill"></i>
                              </button>
                            )}
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => navigate(`/workspaces/${workspace.id}`)}
                              title="詳細を表示"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">このセッションに関連するワークスペースはありません。</p>
            )}
          </div>
        </div>

        {/* 関連タスク */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title">関連タスク</h5>
            <div>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => fetchSessionTasks(clientState)}
                disabled={tasksLoading}
              >
                {tasksLoading ? "読み込み中..." : "更新"}
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* タスク作成フォーム */}
            <div className="border rounded p-3 mb-3 bg-light" onKeyDown={handleKeyDown}>
              <h6 className="mb-3">新しいタスクを作成 <small className="text-muted">(Ctrl+Enter / Cmd+Enterで作成)</small></h6>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="taskName" className="form-label">タスク名 <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      id="taskName"
                      value={taskFormData.name}
                      onChange={(e) => setTaskFormData({...taskFormData, name: e.target.value})}
                      placeholder="タスク名を入力してください"
                      disabled={taskCreating}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="taskDescription" className="form-label">説明</label>
                    <textarea
                      className="form-control"
                      id="taskDescription"
                      rows={3}
                      value={taskFormData.description}
                      onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                      placeholder="タスクの説明を入力してください"
                      disabled={taskCreating}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="taskScript" className="form-label">スクリプト</label>
                    <textarea
                      className="form-control"
                      id="taskScript"
                      rows={6}
                      value={taskFormData.script}
                      onChange={(e) => setTaskFormData({...taskFormData, script: e.target.value})}
                      placeholder="実行するスクリプトを入力してください"
                      disabled={taskCreating}
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary me-2"
                  onClick={handleResetTaskForm}
                  disabled={taskCreating}
                >
                  リセット
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateTask}
                  disabled={taskCreating || !taskFormData.name.trim()}
                >
                  {taskCreating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      作成中...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-1"></i>
                      作成
                    </>
                  )}
                </button>
              </div>
            </div>

            {tasksLoading ? (
              <div className="text-center">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
                <span className="ms-2">関連タスクを読み込んでいます...</span>
              </div>
            ) : tasks.length > 0 ? (
              <>
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>名前</th>
                        <th>ステータス</th>
                        <th>作成日時</th>
                        <th>更新日時</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTasks.map((task) => (
                        <tr key={task.id}>
                          <td>{task.name}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                              {task.status}
                            </span>
                          </td>
                          <td>{formatDate(task.createdAt)}</td>
                          <td>{formatDate(task.updatedAt)}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              詳細
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={tasks.length}
                />
              </>
            ) : (
              <p className="text-muted">このセッションに関連するタスクはありません。</p>
            )}
          </div>
        </div>

        {/* Git Commit失敗ログ */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
              Git Commit失敗ログ
            </h5>
          </div>
          <div className="card-body">
            <GitCommitFailures sessionId={session.id} />
          </div>
        </div>

        {/* セッションログ */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">セッションログ</h5>
          </div>
          <div className="card-body">
            <SessionLogs sessionId={session.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
