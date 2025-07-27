import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import Layout from "~/components/Layout";
import { getWorkspaces, deleteWorkspace, startWorkspace, stopWorkspace } from "~/utils/api";
import { useClient } from "~/components/Client";
import type { Workspace } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - ワークスペース一覧" },
    { name: "description", content: "ワークスペースの一覧を表示します" },
  ];
};

export default function WorkspacesIndex() {
  const clientState = useClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      if (clientState.state !== "authorized") return;

      try {
        setLoading(true);
        const data = await getWorkspaces(clientState);
        setWorkspaces(data);
      } catch (err) {
        console.error("Failed to load workspaces:", err);
        setError(err instanceof Error ? err.message : "ワークスペースの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [clientState]);

  const handleStartWorkspace = async (workspaceId: string) => {
    if (clientState.state !== "authorized") return;
    
    try {
      setActionLoading(workspaceId);
      await startWorkspace(clientState, workspaceId);
      
      // Refresh the list
      const data = await getWorkspaces(clientState);
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to start workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの開始に失敗しました。");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopWorkspace = async (workspaceId: string) => {
    if (clientState.state !== "authorized") return;
    
    try {
      setActionLoading(workspaceId);
      await stopWorkspace(clientState, workspaceId);
      
      // Refresh the list
      const data = await getWorkspaces(clientState);
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to stop workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの停止に失敗しました。");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (clientState.state !== "authorized") return;
    
    if (!confirm(`ワークスペース "${workspaceName}" を削除しますか？この操作は元に戻せません。`)) {
      return;
    }

    try {
      setActionLoading(workspaceId);
      await deleteWorkspace(clientState, workspaceId);
      
      // Refresh the list
      const data = await getWorkspaces(clientState);
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの削除に失敗しました。");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "bg-success";
      case "stopped":
        return "bg-secondary";
      case "starting":
      case "pending":
        return "bg-warning";
      case "stopping":
      case "deleting":
        return "bg-warning";
      case "failed":
      case "error":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "実行中";
      case "stopped":
        return "停止中";
      case "starting":
        return "開始中";
      case "stopping":
        return "停止処理中";
      case "pending":
        return "待機中";
      case "deleting":
        return "削除中";
      case "failed":
        return "失敗";
      case "error":
        return "エラー";
      default:
        return status;
    }
  };

  if (clientState.state === "loading") {
    return (
      <Layout>
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="workspaces-index">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>ワークスペース一覧</h2>
          <Link to="/workspaces/new" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            新規ワークスペース作成
          </Link>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button
              type="button"
              className="btn-close"
              aria-label="閉じる"
              onClick={() => setError(null)}
            ></button>
          </div>
        )}

        {loading ? (
          <div className="d-flex justify-content-center p-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              {workspaces.length === 0 ? (
                <div className="text-center p-5">
                  <i className="bi bi-folder2-open display-1 text-muted mb-3"></i>
                  <h5 className="text-muted">ワークスペースがありません</h5>
                  <p className="text-muted">新しいワークスペースを作成してください。</p>
                  <Link to="/workspaces/new" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>
                    新規ワークスペース作成
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>名前</th>
                        <th>セッションID</th>
                        <th>ステータス</th>
                        <th>作成日時</th>
                        <th>最終更新</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspaces.map((workspace) => (
                        <tr key={workspace.id}>
                          <td>
                            <Link
                              to={`/workspaces/${workspace.id}`}
                              className="text-decoration-none fw-medium"
                            >
                              {workspace.name}
                            </Link>
                          </td>
                          <td>
                            <Link
                              to={`/sessions/${workspace.sessionId}`}
                              className="text-decoration-none text-muted"
                            >
                              {workspace.sessionId.substring(0, 8)}...
                            </Link>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(workspace.status)}`}>
                              {getStatusText(workspace.status)}
                            </span>
                          </td>
                          <td>{new Date(workspace.createdAt).toLocaleString("ja-JP")}</td>
                          <td>{new Date(workspace.updatedAt).toLocaleString("ja-JP")}</td>
                          <td>
                            <div className="btn-group btn-group-sm" role="group">
                              {workspace.status.toLowerCase() === "stopped" && (
                                <button
                                  type="button"
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => handleStartWorkspace(workspace.id)}
                                  disabled={actionLoading === workspace.id}
                                >
                                  {actionLoading === workspace.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <i className="bi bi-play-fill"></i>
                                  )}
                                </button>
                              )}
                              {workspace.status.toLowerCase() === "running" && (
                                <button
                                  type="button"
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={() => handleStopWorkspace(workspace.id)}
                                  disabled={actionLoading === workspace.id}
                                >
                                  {actionLoading === workspace.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <i className="bi bi-stop-fill"></i>
                                  )}
                                </button>
                              )}
                              <Link
                                to={`/workspaces/${workspace.id}`}
                                className="btn btn-outline-primary btn-sm"
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                                disabled={actionLoading === workspace.id}
                              >
                                {actionLoading === workspace.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-trash"></i>
                                )}
                              </button>
                            </div>
                          </td>
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