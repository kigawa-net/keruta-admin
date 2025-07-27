import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useParams, useNavigate, Link } from "@remix-run/react";
import Layout from "~/components/Layout";
import { getWorkspace, getSession, startWorkspace, stopWorkspace, deleteWorkspace } from "~/utils/api";
import { useClient } from "~/components/Client";
import type { Workspace, Session } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - ワークスペース詳細" },
    { name: "description", content: "ワークスペースの詳細情報を表示します" },
  ];
};

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientState = useClient();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (clientState.state !== "authorized" || !id) return;

      try {
        setLoading(true);
        const workspaceData = await getWorkspace(clientState, id);
        setWorkspace(workspaceData);

        // Load associated session
        const sessionData = await getSession(clientState, workspaceData.sessionId);
        setSession(sessionData);
      } catch (err) {
        console.error("Failed to load workspace:", err);
        setError(err instanceof Error ? err.message : "ワークスペースの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [clientState, id]);

  const handleStartWorkspace = async () => {
    if (!workspace || clientState.state !== "authorized") return;
    
    try {
      setActionLoading(true);
      const updatedWorkspace = await startWorkspace(clientState, workspace.id);
      setWorkspace(updatedWorkspace);
    } catch (err) {
      console.error("Failed to start workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの開始に失敗しました。");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopWorkspace = async () => {
    if (!workspace || clientState.state !== "authorized") return;
    
    try {
      setActionLoading(true);
      const updatedWorkspace = await stopWorkspace(clientState, workspace.id);
      setWorkspace(updatedWorkspace);
    } catch (err) {
      console.error("Failed to stop workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの停止に失敗しました。");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace || clientState.state !== "authorized") return;
    
    if (!confirm(`ワークスペース "${workspace.name}" を削除しますか？この操作は元に戻せません。`)) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteWorkspace(clientState, workspace.id);
      navigate("/workspaces");
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの削除に失敗しました。");
    } finally {
      setActionLoading(false);
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

  if (clientState.state === "loading" || loading) {
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

  if (!workspace) {
    return (
      <Layout>
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          ワークスペースが見つかりません。
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="workspace-detail">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/workspaces">ワークスペース</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {workspace.name}
                </li>
              </ol>
            </nav>
            <h2 className="mb-0">{workspace.name}</h2>
          </div>
          <div className="d-flex gap-2">
            {workspace.status.toLowerCase() === "stopped" && (
              <button
                type="button"
                className="btn btn-success"
                onClick={handleStartWorkspace}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    開始中...
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-fill me-2"></i>
                    開始
                  </>
                )}
              </button>
            )}
            {workspace.status.toLowerCase() === "running" && (
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleStopWorkspace}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    停止中...
                  </>
                ) : (
                  <>
                    <i className="bi bi-stop-fill me-2"></i>
                    停止
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteWorkspace}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  削除中...
                </>
              ) : (
                <>
                  <i className="bi bi-trash me-2"></i>
                  削除
                </>
              )}
            </button>
          </div>
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

        <div className="row">
          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">基本情報</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-sm-3">
                    <strong>ステータス:</strong>
                  </div>
                  <div className="col-sm-9">
                    <span className={`badge ${getStatusBadgeClass(workspace.status)}`}>
                      {getStatusText(workspace.status)}
                    </span>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-sm-3">
                    <strong>ID:</strong>
                  </div>
                  <div className="col-sm-9">
                    <code>{workspace.id}</code>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-sm-3">
                    <strong>セッション:</strong>
                  </div>
                  <div className="col-sm-9">
                    {session ? (
                      <Link to={`/sessions/${session.id}`} className="text-decoration-none">
                        {session.name}
                      </Link>
                    ) : (
                      <code>{workspace.sessionId}</code>
                    )}
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-sm-3">
                    <strong>テンプレート:</strong>
                  </div>
                  <div className="col-sm-9">
                    <code>{workspace.templateId}</code>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-sm-3">
                    <strong>作成日時:</strong>
                  </div>
                  <div className="col-sm-9">
                    {new Date(workspace.createdAt).toLocaleString("ja-JP")}
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-sm-3">
                    <strong>最終更新:</strong>
                  </div>
                  <div className="col-sm-9">
                    {new Date(workspace.updatedAt).toLocaleString("ja-JP")}
                  </div>
                </div>
                {workspace.lastUsedAt && (
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>最終使用:</strong>
                    </div>
                    <div className="col-sm-9">
                      {new Date(workspace.lastUsedAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {workspace.resourceInfo && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0">リソース情報</h5>
                </div>
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>Namespace:</strong>
                    </div>
                    <div className="col-sm-9">
                      <code>{workspace.resourceInfo.kubernetesNamespace}</code>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-sm-3">
                      <strong>PVC:</strong>
                    </div>
                    <div className="col-sm-9">
                      <code>{workspace.resourceInfo.persistentVolumeClaimName}</code>
                    </div>
                  </div>
                  {workspace.resourceInfo.podName && (
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>Pod:</strong>
                      </div>
                      <div className="col-sm-9">
                        <code>{workspace.resourceInfo.podName}</code>
                      </div>
                    </div>
                  )}
                  {workspace.resourceInfo.serviceName && (
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>Service:</strong>
                      </div>
                      <div className="col-sm-9">
                        <code>{workspace.resourceInfo.serviceName}</code>
                      </div>
                    </div>
                  )}
                  {workspace.resourceInfo.ingressUrl && (
                    <div className="row mb-3">
                      <div className="col-sm-3">
                        <strong>URL:</strong>
                      </div>
                      <div className="col-sm-9">
                        <a 
                          href={workspace.resourceInfo.ingressUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                        >
                          {workspace.resourceInfo.ingressUrl}
                          <i className="bi bi-box-arrow-up-right ms-1"></i>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="col-md-4">
            {session && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0">関連セッション</h5>
                </div>
                <div className="card-body">
                  <h6 className="card-subtitle mb-2">
                    <Link to={`/sessions/${session.id}`} className="text-decoration-none">
                      {session.name}
                    </Link>
                  </h6>
                  <p className="card-text">
                    <small className="text-muted">
                      ステータス: <span className="badge bg-secondary">{session.status}</span>
                    </small>
                  </p>
                  {session.description && (
                    <p className="card-text">{session.description}</p>
                  )}
                  <Link to={`/sessions/${session.id}`} className="btn btn-outline-primary btn-sm">
                    セッション詳細
                  </Link>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">クイックアクション</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to="/workspaces" className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-left me-2"></i>
                    ワークスペース一覧に戻る
                  </Link>
                  {session && (
                    <Link to={`/sessions/${session.id}`} className="btn btn-outline-primary">
                      <i className="bi bi-person-workspace me-2"></i>
                      セッション詳細
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}