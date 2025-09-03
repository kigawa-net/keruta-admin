import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useClient, ClientState } from "~/components/Client";
import { SessionLog } from "~/types";
import { getSessionLogs, getSessionLogCount } from "~/utils/api";
import { useSessionSSE } from "~/hooks/useSessionSSE";

interface SessionLogsProps {
  sessionId: string;
}

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

export default function SessionLogs({ sessionId }: SessionLogsProps) {
  const clientState = useClient();
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [autoUpdatePaused, setAutoUpdatePaused] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    level: "",
    source: "",
    action: "",
    limit: 50,
    offset: 0
  });

  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [preserveLineBreaks, setPreserveLineBreaks] = useState(true);

  // Debounce timer for log updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLogsRef = useRef<SessionLog[]>([]);

  // Handle real-time log creation with debouncing
  const handleLogCreated = useCallback((logData: any) => {
    if (!realTimeEnabled || autoUpdatePaused) return;
    
    // Convert the log data to SessionLog format
    const newLog: SessionLog = {
      id: logData.id,
      sessionId: logData.sessionId || sessionId,
      level: logData.level,
      source: logData.source,
      action: logData.action,
      message: logData.message,
      details: logData.details || undefined,
      metadata: logData.metadata || {},
      userId: logData.userId || undefined,
      timestamp: logData.timestamp
    };

    // Add to pending logs and debounce the update
    pendingLogsRef.current.push(newLog);

    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // Set new timer to batch updates
    updateTimerRef.current = setTimeout(() => {
      const logsToAdd = [...pendingLogsRef.current];
      pendingLogsRef.current = [];

      if (logsToAdd.length === 0) return;

      setLogs(prevLogs => {
        const existingIds = new Set(prevLogs.map(log => log.id));
        const uniqueNewLogs = logsToAdd.filter(log => !existingIds.has(log.id));
        
        if (uniqueNewLogs.length === 0) return prevLogs;
        
        return [...uniqueNewLogs, ...prevLogs];
      });

      setTotalCount(prevCount => prevCount + logsToAdd.length);
    }, 500); // 500ms debounce
  }, [sessionId, realTimeEnabled]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Set up SSE connection for real-time updates
  const { connected: sseConnected, error: sseError } = useSessionSSE({
    clientState,
    sessionId,
    onLogCreated: handleLogCreated,
  });

  // Fetch session logs
  const fetchLogs = async (clientState: ClientState) => {
    if (clientState.state === "loading") return;

    try {
      setLoading(true);
      
      // Get logs with current filters
      const filterParams = {
        level: filters.level || undefined,
        source: filters.source || undefined,
        action: filters.action || undefined,
        limit: filters.limit,
        offset: filters.offset
      };
      
      const [logsData, countData] = await Promise.all([
        getSessionLogs(clientState, sessionId, filterParams),
        getSessionLogCount(clientState, sessionId, {
          level: filters.level || undefined,
          source: filters.source || undefined,
          action: filters.action || undefined,
        })
      ]);
      
      setLogs(logsData);
      setTotalCount(countData.count);
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
  }, [clientState, sessionId, filters]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset pagination when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset
    }));
  };

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

  // Clear filters
  const clearFilters = () => {
    setFilters({
      level: "",
      source: "",
      action: "",
      limit: 50,
      offset: 0
    });
  };

  // Get unique values for filter dropdowns (memoized to prevent recalculation)
  const uniqueSources = useMemo(() => [...new Set(logs.map(log => log.source))], [logs]);
  const uniqueActions = useMemo(() => [...new Set(logs.map(log => log.action))], [logs]);

  // Memoize reversed logs to prevent recreation on every render
  const displayLogs = useMemo(() => logs.slice().reverse(), [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <p className="mt-2">セッションログを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="session-logs">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <h5 className="mb-0 me-3">セッションログ ({totalCount}件)</h5>
          {sseConnected && (
            <span className="badge bg-success me-2">
              <i className="bi bi-broadcast me-1"></i>
              リアルタイム接続中
            </span>
          )}
          {sseError && (
            <span className="badge bg-warning text-dark me-2" title={sseError}>
              <i className="bi bi-exclamation-triangle me-1"></i>
              接続エラー
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="realTimeToggle"
              checked={realTimeEnabled}
              onChange={(e) => setRealTimeEnabled(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="realTimeToggle">
              リアルタイム更新
            </label>
          </div>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => fetchLogs(clientState)}
            disabled={loading}
          >
            {loading ? "更新中..." : "更新"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label">レベル</label>
              <select 
                className="form-select form-select-sm"
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
              >
                <option value="">全て</option>
                <option value="TRACE">TRACE</option>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="FATAL">FATAL</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">ソース</label>
              <select 
                className="form-select form-select-sm"
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
              >
                <option value="">全て</option>
                {uniqueSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">アクション</label>
              <select 
                className="form-select form-select-sm"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">全て</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">表示件数</label>
              <select 
                className="form-select form-select-sm"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value="25">25件</option>
                <option value="50">50件</option>
                <option value="100">100件</option>
                <option value="200">200件</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end gap-2">
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={clearFilters}
              >
                フィルタクリア
              </button>
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

      {logs.length === 0 && !loading ? (
        <div className="alert alert-info" role="alert">
          ログエントリが見つかりません。
        </div>
      ) : (
        <>
          {/* Log entries */}
          <div className="logs-container">
            {displayLogs.map((log) => (
              <div key={log.id} className="card mb-2">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center">
                      <span className={`badge me-2 ${getLogLevelBadgeClass(log.level)}`}>
                        {log.level}
                      </span>
                      <small className="text-muted me-2">
                        {formatTimestamp(log.timestamp)}
                      </small>
                      <span className="badge bg-light text-dark me-2">
                        {log.source}
                      </span>
                      <span className="badge bg-secondary me-2">
                        {log.action}
                      </span>
                      {log.userId && (
                        <span className="badge bg-info me-2">
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
          </div>

          {/* Pagination */}
          {totalCount > filters.limit && (
            <nav aria-label="ログページネーション" className="mt-3">
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  {filters.offset + 1} - {Math.min(filters.offset + filters.limit, totalCount)} / {totalCount}件
                </small>
                <div className="btn-group">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={filters.offset === 0}
                    onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                  >
                    前へ
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    disabled={filters.offset + filters.limit >= totalCount}
                    onClick={() => handlePageChange(filters.offset + filters.limit)}
                  >
                    次へ
                  </button>
                </div>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}