import { useState, useEffect } from "react";
import { useClient } from "~/components/Client";
import { getAllGitCommitFailures, formatGitCommitFailure, type GitCommitFailure } from "~/utils/gitCommitLogs";

interface GitCommitFailuresProps {
  sessionId: string;
  taskId?: string;
  showHeader?: boolean;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function GitCommitFailures({ sessionId, taskId, showHeader = true }: GitCommitFailuresProps) {
  const clientState = useClient();
  const [failures, setFailures] = useState<GitCommitFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFailures, setExpandedFailures] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFailures = async () => {
      if (clientState.state === "loading") return;

      try {
        setLoading(true);
        const gitFailures = await getAllGitCommitFailures(clientState, sessionId, taskId);
        setFailures(gitFailures);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch git commit failures:", err);
        setError("Git commit失敗ログの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchFailures();
  }, [clientState, sessionId, taskId]);

  const toggleFailureExpansion = (failureId: string) => {
    setExpandedFailures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(failureId)) {
        newSet.delete(failureId);
      } else {
        newSet.add(failureId);
      }
      return newSet;
    });
  };

  const getFailureId = (failure: GitCommitFailure): string => {
    return `${failure.timestamp}-${failure.submodulePath}`;
  };

  if (loading) {
    return (
      <div className="text-center my-3">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <span className="ms-2">Git commit失敗ログを読み込んでいます...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  if (failures.length === 0) {
    return (
      <div className="text-muted text-center py-3">
        <i className="bi bi-check-circle me-2"></i>
        Git commitの失敗は記録されていません
      </div>
    );
  }

  return (
    <div className="git-commit-failures">
      {showHeader && (
        <div className="d-flex align-items-center mb-3">
          <h6 className="mb-0 me-2">
            <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            Git Commit失敗ログ
          </h6>
          <span className="badge bg-danger">{failures.length}件</span>
        </div>
      )}

      <div className="commit-failures-list">
        {failures.map((failure) => {
          const failureId = getFailureId(failure);
          const isExpanded = expandedFailures.has(failureId);

          return (
            <div key={failureId} className="card mb-3 border-danger">
              <div className="card-header bg-danger bg-opacity-10">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <i className="bi bi-git text-danger me-2"></i>
                      <strong className="text-danger">
                        {failure.submodulePath}
                      </strong>
                      <span className="badge bg-secondary ms-2">
                        {formatTimestamp(failure.timestamp)}
                      </span>
                    </div>
                    <div className="mb-2">
                      <strong>コミットメッセージ:</strong>
                      <span className="ms-2 text-muted">{failure.commitMessage}</span>
                    </div>
                    <div>
                      <strong>エラー:</strong>
                      <code className="ms-2 text-danger">{failure.errorOutput.substring(0, 100)}{failure.errorOutput.length > 100 ? '...' : ''}</code>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => toggleFailureExpansion(failureId)}
                  >
                    {isExpanded ? (
                      <>
                        <i className="bi bi-chevron-up me-1"></i>
                        詳細を隠す
                      </>
                    ) : (
                      <>
                        <i className="bi bi-chevron-down me-1"></i>
                        詳細を表示
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>基本情報</h6>
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <th>タスクID</th>
                            <td>
                              <span className="font-monospace">{failure.taskId}</span>
                            </td>
                          </tr>
                          <tr>
                            <th>セッションID</th>
                            <td>
                              <span className="font-monospace">{failure.sessionId}</span>
                            </td>
                          </tr>
                          <tr>
                            <th>作業ディレクトリ</th>
                            <td>
                              <code>{failure.workingDirectory}</code>
                            </td>
                          </tr>
                          {failure.environment && (
                            <tr>
                              <th>実行環境</th>
                              <td>
                                {failure.environment.user}@{failure.environment.hostname}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6>エラー詳細</h6>
                      <div className="bg-light p-3 rounded">
                        <pre className="mb-0" style={{ fontSize: "0.85em", whiteSpace: "pre-wrap" }}>
                          {failure.errorOutput}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {(failure.gitStatus || failure.gitLog || failure.gitRemote) && (
                    <div className="mt-4">
                      <h6>Git状態情報</h6>
                      <div className="row">
                        {failure.gitStatus && (
                          <div className="col-md-4">
                            <strong>Git Status:</strong>
                            <div className="bg-light p-2 rounded mt-1">
                              <pre className="mb-0" style={{ fontSize: "0.8em" }}>
                                {failure.gitStatus}
                              </pre>
                            </div>
                          </div>
                        )}
                        {failure.gitLog && (
                          <div className="col-md-4">
                            <strong>Recent Commits:</strong>
                            <div className="bg-light p-2 rounded mt-1">
                              <pre className="mb-0" style={{ fontSize: "0.8em" }}>
                                {failure.gitLog}
                              </pre>
                            </div>
                          </div>
                        )}
                        {failure.gitRemote && (
                          <div className="col-md-4">
                            <strong>Remote Info:</strong>
                            <div className="bg-light p-2 rounded mt-1">
                              <pre className="mb-0" style={{ fontSize: "0.8em" }}>
                                {failure.gitRemote}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-2 bg-info bg-opacity-10 rounded">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      このエラーログを使用してGit commitの失敗原因を特定し、必要な修正を行ってください。
                      作業ディレクトリとGit状態を確認して、競合やアクセス権限の問題を解決してください。
                    </small>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}