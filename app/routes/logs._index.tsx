import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";
import { getRecentSessionLogs, getSessionLogsByLevel } from "~/utils/api";
import { useClient, ClientState } from "~/components/Client";
import { SessionLog } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - セッションログ" },
    { name: "description", content: "全セッションのログを確認できます" },
  ];
};

// Log level badge style mapping
function getLogLevelBadgeClass(level: string): string {
  switch (level.toUpperCase()) {
    case "TRACE":
      return "bg-light text-dark";
    case "DEBUG":
      return "bg-info";
    case "INFO":
      return "bg-primary";
    case "WARN":
      return "bg-warning text-dark";
    case "ERROR":
      return "bg-danger";
    case "FATAL":
      return "bg-dark";
    default:
      return "bg-secondary";
  }
}

// Format timestamp for display
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  });
}

export default function SessionLogsIndex() {
  const clientState = useClient();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [viewMode, setViewMode] = useState<"recent" | "level">("recent");
  const [selectedLevel, setSelectedLevel] = useState("ERROR");
  const [limit, setLimit] = useState(100);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [preserveLineBreaks, setPreserveLineBreaks] = useState(true);

  // Fetch logs based on current view mode
  const fetchLogs = async (clientState: ClientState) => {
    if (clientState.state === "loading") return;

    try {
      setLoading(true);
      
      let logsData: SessionLog[];
      if (viewMode === "recent") {
        logsData = await getRecentSessionLogs(clientState, limit);
      } else {
        logsData = await getSessionLogsByLevel(clientState, selectedLevel, limit);
      }
      
      setLogs(logsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch session logs:", err);
      setError("セッションログの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(clientState);
  }, [clientState, viewMode, selectedLevel, limit]);

  // Toggle log expansion
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Handle view mode change
  const handleViewModeChange = (mode: "recent" | "level") => {
    setViewMode(mode);
    setExpandedLogs(new Set()); // Clear expanded logs when switching modes
  };

  return (
    <Layout>
      <div className="session-logs-index">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>セッションログ</h2>
          <button 
            className="btn btn-outline-primary"
            onClick={() => fetchLogs(clientState)}
            disabled={loading}
          >
            {loading ? "更新中..." : "更新"}
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label">表示モード</label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${viewMode === "recent" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => handleViewModeChange("recent")}
                  >
                    最新ログ
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewMode === "level" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => handleViewModeChange("level")}
                  >
                    レベル別
                  </button>
                </div>
              </div>
              
              {viewMode === "level" && (
                <div className="col-md-3">
                  <label className="form-label">ログレベル</label>
                  <select 
                    className="form-select"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                  >
                    <option value="TRACE">TRACE</option>
                    <option value="DEBUG">DEBUG</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                    <option value="FATAL">FATAL</option>
                  </select>
                </div>
              )}
              
              <div className="col-md-3">
                <label className="form-label">表示件数</label>
                <select 
                  className="form-select"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                >
                  <option value="50">50件</option>
                  <option value="100">100件</option>
                  <option value="200">200件</option>
                  <option value="500">500件</option>
                </select>
              </div>

              <div className="col-md-3 d-flex align-items-end justify-content-between">
                <div className="text-muted">
                  <strong>{logs.length}</strong> 件のログを表示中
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="preserveLineBreaks"
                    checked={preserveLineBreaks}
                    onChange={(e) => setPreserveLineBreaks(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="preserveLineBreaks">
                    改行表示
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
            <p className="mt-2">セッションログを読み込んでいます...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="alert alert-info" role="alert">
            ログエントリが見つかりません。
          </div>
        ) : (
          <div className="logs-container">
            {logs.slice().reverse().map((log) => (
              <div key={log.id} className="card mb-2">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center flex-wrap">
                      <span className={`badge me-2 ${getLogLevelBadgeClass(log.level)}`}>
                        {log.level}
                      </span>
                      <small className="text-muted me-2">
                        {formatTimestamp(log.timestamp)}
                      </small>
                      <span className="badge bg-light text-dark me-2">
                        <a 
                          href={`/sessions/${log.sessionId}`} 
                          className="text-decoration-none text-dark"
                          title="セッション詳細を表示"
                        >
                          Session: {log.sessionId.slice(0, 8)}...
                        </a>
                      </span>
                      <span className="badge bg-info text-dark me-2">
                        {log.source}
                      </span>
                      <span className="badge bg-secondary me-2">
                        {log.action}
                      </span>
                      {log.userId && (
                        <span className="badge bg-primary me-2">
                          User: {log.userId}
                        </span>
                      )}
                    </div>
                    {(log.details || Object.keys(log.metadata).length > 0) && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => toggleLogExpansion(log.id)}
                      >
                        {expandedLogs.has(log.id) ? "縮小" : "詳細"}
                      </button>
                    )}
                  </div>
                  
                  <div className="log-message" style={{ whiteSpace: preserveLineBreaks ? 'pre-wrap' : 'nowrap', overflowWrap: 'break-word' }}>
                    {log.message}
                  </div>
                  
                  {expandedLogs.has(log.id) && (
                    <div className="mt-3">
                      {log.details && (
                        <div className="mb-2">
                          <strong>詳細:</strong>
                          <div className="ms-2 text-muted">
                            {log.details}
                          </div>
                        </div>
                      )}
                      
                      {Object.keys(log.metadata).length > 0 && (
                        <div>
                          <strong>メタデータ:</strong>
                          <pre className="ms-2 mt-1 small bg-light p-2 rounded">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {logs.length === limit && (
              <div className="text-center mt-3">
                <div className="alert alert-info">
                  表示件数の上限({limit}件)に達しています。さらに多くのログを表示するには、表示件数を増やしてください。
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}