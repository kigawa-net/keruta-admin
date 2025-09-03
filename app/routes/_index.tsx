import type { MetaFunction } from "@remix-run/node";
import Layout from "~/components/Layout";
import { useState, useEffect } from "react";
import { useClient } from "~/components/Client";
import { useManagementSSE } from "~/hooks/useManagementSSE";
import { apiGet } from "~/utils/api";
import RealtimeIndicator from "~/components/RealtimeIndicator";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - ダッシュボード" },
    { name: "description", content: "keruta管理パネルのダッシュボード" },
  ];
};

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalTasks: number;
  runningTasks: number;
  recentActivities: Array<{
    id: string;
    type: 'session' | 'task';
    action: string;
    name: string;
    timestamp: string;
  }>;
}

export default function Index() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalTasks: 0,
    runningTasks: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const clientState = useClient();

  // Real-time updates for dashboard
  const { connected, error: sseError, lastEventTime } = useManagementSSE({
    clientState,
    onEvent: (event) => {
      // Add new activity to recent activities
      const newActivity = {
        id: event.entityId,
        type: event.type.includes('session') ? 'session' as const : 'task' as const,
        action: event.type,
        name: event.data.name || event.data.title || 'Unknown',
        timestamp: new Date().toISOString()
      };
      
      setStats(prevStats => ({
        ...prevStats,
        recentActivities: [newActivity, ...prevStats.recentActivities].slice(0, 10)
      }));
      
      setConnectionStatus(`Latest: ${event.type} at ${new Date().toLocaleTimeString()}`);
      
      // Refresh stats when major changes occur
      if (event.type.includes('created') || event.type.includes('deleted')) {
        fetchStats();
      }
    }
  });

  const fetchStats = async () => {
    if (clientState.state === "loading") return;
    
    try {
      setLoading(true);
      const [sessions, tasks] = await Promise.all([
        apiGet(clientState, "sessions"),
        apiGet(clientState, "tasks")
      ]);
      
      const activeSessions = sessions.filter((s: any) => s.status === 'ACTIVE').length;
      const runningTasks = tasks.filter((t: any) => t.status === 'RUNNING').length;
      
      setStats({
        totalSessions: sessions.length,
        activeSessions,
        totalTasks: tasks.length,
        runningTasks,
        recentActivities: stats.recentActivities // Keep existing activities
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [clientState]);

  useEffect(() => {
    if (connected && !sseError) {
      setConnectionStatus("リアルタイム更新: 接続中");
    } else if (sseError) {
      setConnectionStatus(`リアルタイム更新: エラー - ${sseError}`);
    } else {
      setConnectionStatus("リアルタイム更新: 切断");
    }
  }, [connected, sseError]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <Layout>
      <div className="dashboard">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>ダッシュボード</h2>
          <RealtimeIndicator showStatus={true} />
        </div>
        
        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="card border-primary">
              <div className="card-body text-center">
                <div className="display-6 text-primary">{loading ? '...' : stats.totalSessions}</div>
                <small className="text-muted">総セッション数</small>
                <div className="mt-1">
                  <span className="badge bg-success">{loading ? '...' : stats.activeSessions} アクティブ</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-info">
              <div className="card-body text-center">
                <div className="display-6 text-info">{loading ? '...' : stats.totalTasks}</div>
                <small className="text-muted">総タスク数</small>
                <div className="mt-1">
                  <span className="badge bg-warning text-dark">{loading ? '...' : stats.runningTasks} 実行中</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-success">
              <div className="card-body text-center">
                <div className="display-6 text-success">{connected ? '✓' : '✗'}</div>
                <small className="text-muted">リアルタイム接続</small>
                <div className="mt-1">
                  <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                    {connected ? '接続中' : '切断'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-warning">
              <div className="card-body text-center">
                <div className="display-6 text-warning">{stats.recentActivities.length}</div>
                <small className="text-muted">最近のアクティビティ</small>
                <div className="mt-1">
                  <span className="badge bg-info text-dark">直近10件</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="row mb-4">
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title">リアルタイムアクティビティ</h5>
              </div>
              <div className="card-body">
                {stats.recentActivities.length === 0 ? (
                  <p className="text-muted">アクティビティなし</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {stats.recentActivities.map((activity) => (
                      <div key={`${activity.id}-${activity.timestamp}`} className="list-group-item px-0 py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className={`badge me-2 ${
                              activity.type === 'session' ? 'bg-primary' : 'bg-info'
                            }`}>
                              {activity.type === 'session' ? 'セッション' : 'タスク'}
                            </span>
                            <strong>{activity.name}</strong>
                            <div className="small text-muted">{activity.action}</div>
                          </div>
                          <small className="text-muted">
                            {formatDate(activity.timestamp)}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        
        <div className="row mt-4">
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title">システム状態</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 bg-light rounded">
                      <div className="h6 mb-1">{stats.activeSessions}</div>
                      <small className="text-muted">アクティブセッション</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-light rounded">
                      <div className="h6 mb-1">{stats.runningTasks}</div>
                      <small className="text-muted">実行中タスク</small>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 bg-light rounded">
                      <div className="h6 mb-1">
                        {lastEventTime ? formatDate(new Date(lastEventTime).toISOString()) : 'なし'}
                      </div>
                      <small className="text-muted">最終更新時刻</small>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <a href="/tasks" className="btn btn-primary me-2">タスク一覧へ</a>
                  <a href="/sessions" className="btn btn-outline-primary">セッション一覧へ</a>
                </div>
              </div>
            </div>
          </div>
        </div>
          
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title">クイックリンク</h5>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/tasks" className="btn btn-outline-primary w-100 py-3">
                      <div>タスク管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/sessions" className="btn btn-outline-primary w-100 py-3">
                      <div>セッション管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/documents" className="btn btn-outline-primary w-100 py-3">
                      <div>ドキュメント管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/repositories" className="btn btn-outline-primary w-100 py-3">
                      <div>リポジトリ管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/templates" className="btn btn-outline-primary w-100 py-3">
                      <div>テンプレート管理</div>
                    </a>
                  </div>
                  <div className="col-6 col-sm-4 col-lg-6">
                    <a href="/kubernetes" className="btn btn-outline-primary w-100 py-3">
                      <div>Kubernetes設定</div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">API ドキュメント</h5>
              </div>
              <div className="card-body">
                <p>API ドキュメントへのリンク:</p>
                <a href="/swagger-ui" className="btn btn-secondary" target="_blank">Swagger UI を開く</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}