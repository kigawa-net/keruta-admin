import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate, useParams } from "@remix-run/react";
import Layout from "~/components/Layout";
import { getSession, deleteSession, apiGet, getWorkspaces, startWorkspace, stopWorkspace } from "~/utils/api";
import { useClient, ClientState } from "~/components/Client";
import { Session, Workspace } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - セッション詳細" },
    { name: "description", content: "セッションの詳細情報を表示します" },
  ];
};

// Remove local Session interface - using the one from types

// タスクデータの型定義
interface Task {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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
      setTasks(data);
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

        {/* メタデータ情報 */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title">メタデータ</h5>
          </div>
          <div className="card-body">
            {Object.keys(session.metadata).length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>キー</th>
                      <th>値</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(session.metadata).map(([key, value]) => (
                      <tr key={key}>
                        <td><strong>{key}</strong></td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">メタデータはありません。</p>
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
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title">関連タスク</h5>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => fetchSessionTasks(clientState)}
              disabled={tasksLoading}
            >
              {tasksLoading ? "読み込み中..." : "更新"}
            </button>
          </div>
          <div className="card-body">
            {tasksLoading ? (
              <div className="text-center">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
                <span className="ms-2">関連タスクを読み込んでいます...</span>
              </div>
            ) : tasks.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>タイトル</th>
                      <th>ステータス</th>
                      <th>作成日時</th>
                      <th>更新日時</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.id}</td>
                        <td>{task.title}</td>
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
            ) : (
              <p className="text-muted">このセッションに関連するタスクはありません。</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
