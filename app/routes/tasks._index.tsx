import {useEffect, useState} from "react";
import type {MetaFunction} from "@remix-run/node";
import Layout from "~/components/Layout";
import {apiDelete, apiGet, pauseTask, resumeTask} from "~/utils/api";
import {ClientState, useClient} from "~/components/Client";
import {useManagementSSE} from "~/hooks/useManagementSSE";
import RealtimeIndicator from "~/components/RealtimeIndicator";
import {formatDate} from "~/utils/dateUtils";

export const meta: MetaFunction = () => {
    return [
        {title: "keruta管理パネル - タスク管理"},
        {name: "description", content: "タスクの一覧・詳細・新規作成・編集・削除・Podログ閲覧・エージェント設定"},
    ];
};

// タスクデータの型定義
interface Task {
    id: string;
    title: string;
    description: string;
    priority: number;
    status: string;
    documents: any[];
    image: string | null;
    namespace: string;
    jobName: string | null;
    podName: string | null;
    additionalEnv: Record<string, string>;
    kubernetesManifest: any | null;
    logs: string | null;
    agentId: string | null;
    repositoryId: string | null;
    parentId: string | null;
    session: string;
    createdAt: string;
    updatedAt: string;
}

// セッション情報の型定義
interface Session {
    id: string;
    name: string;
    status: string;
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


export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<Record<string, Session>>({});
    const [connectionStatus, setConnectionStatus] = useState<string>("");
    const clientState = useClient()

    // セッション一覧を取得する関数
    const fetchSessions = async (clientState: ClientState) => {
        if (clientState.state === "loading") return;
        try {
            const data = await apiGet<Session[]>(clientState, "sessions");
            const sessionMap = data.reduce((acc, session) => {
                acc[session.id] = session;
                return acc;
            }, {} as Record<string, Session>);
            setSessions(sessionMap);
        } catch (err) {
            console.error("セッション一覧の取得に失敗しました:", err);
        }
    };

    // タスク一覧を取得する関数
    const fetchTasks = async (clientState: ClientState) => {
        console.debug("fetch")
        if (clientState.state == "loading") return
        console.debug("fetch2")
        try {
            setLoading(true);
            // Use the apiGet function which now uses the server-side API proxy route
            const data = await apiGet<Task[]>(clientState, "tasks");
            console.debug("fetch3")
            setTasks(data);
            setError(null);
        } catch (err) {
            console.error("タスク一覧の取得に失敗しました:", err);
            setError("タスク一覧の取得に失敗しました。");
        } finally {
            console.debug("finary")
            setLoading(false);
        }
    };

    // Real-time updates for tasks
    const { connected, error: sseError, lastEventTime } = useManagementSSE({
        clientState,
        onTaskUpdate: (updatedTask) => {
            setTasks(prevTasks => 
                prevTasks.map(task => 
                    task.id === updatedTask.id ? updatedTask : task
                )
            );
            setConnectionStatus(`Task updated: ${new Date().toLocaleTimeString()}`);
        },
        onTaskCreated: (newTask) => {
            setTasks(prevTasks => [newTask, ...prevTasks]);
            setConnectionStatus(`New task created: ${new Date().toLocaleTimeString()}`);
        },
        onTaskDeleted: (taskId) => {
            setTasks(prevTasks => 
                prevTasks.filter(task => task.id !== taskId)
            );
            setConnectionStatus(`Task deleted: ${new Date().toLocaleTimeString()}`);
        },
        onSessionUpdate: (updatedSession) => {
            setSessions(prevSessions => ({
                ...prevSessions,
                [updatedSession.id]: updatedSession
            }));
        }
    });

    // コンポーネントのマウント時にタスク一覧とセッション一覧を取得
    useEffect(() => {
        fetchSessions(clientState);
        fetchTasks(clientState);
    }, [clientState]);

    // Update connection status
    useEffect(() => {
        if (connected && !sseError) {
            setConnectionStatus("リアルタイム更新: 接続中");
        } else if (sseError) {
            setConnectionStatus(`リアルタイム更新: エラー - ${sseError}`);
        } else {
            setConnectionStatus("リアルタイム更新: 切断");
        }
    }, [connected, sseError]);

    // 更新ボタンのクリックハンドラ
    const handleRefresh = () => {
        fetchTasks(clientState);
    };

    // タスク削除のハンドラ
    const handleDelete = async (taskId: string, taskTitle: string) => {
        if (clientState.state === "loading") return;

        if (window.confirm(`タスク「${taskTitle}」を削除してもよろしいですか？`)) {
            try {
                await apiDelete(clientState, `tasks/${taskId}`);
                // 削除成功後、タスク一覧を再取得
                fetchTasks(clientState);
            } catch (err) {
                console.error("タスクの削除に失敗しました:", err);
            }
        }
    };

    // タスク編集ページへの遷移ハンドラ
    const handleEdit = (taskId: string) => {
        window.location.href = `/tasks/edit/${taskId}`;
    };

    // タスク詳細ページへの遷移ハンドラ
    const handleDetails = (taskId: string) => {
        window.location.href = `/tasks/${taskId}`;
    };

    // タスク一時停止のハンドラ
    const handlePause = async (taskId: string, taskTitle: string) => {
        if (clientState.state === "loading") return;

        try {
            await pauseTask(clientState, taskId);
            fetchTasks(clientState);
        } catch (err) {
            console.error("タスクの一時停止に失敗しました:", err);
        }
    };

    // タスク再開のハンドラ
    const handleResume = async (taskId: string, taskTitle: string) => {
        if (clientState.state === "loading") return;

        try {
            await resumeTask(clientState, taskId);
            fetchTasks(clientState);
        } catch (err) {
            console.error("タスクの再開に失敗しました:", err);
        }
    };

    return (
        <Layout>
            <div className="tasks">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2>タスク管理</h2>
                    <RealtimeIndicator showStatus={true} />
                </div>

                <div className="d-flex justify-content-between mb-3">
                    <div>
                        <button className="btn btn-primary me-2" onClick={() => window.location.href = "/tasks/new"}>新規タスク作成</button>
                        <button className="btn btn-outline-secondary" onClick={handleRefresh}>更新</button>
                    </div>
                    <div className="d-flex">
                        <input
                            type="text"
                            className="form-control me-2"
                            placeholder="タスク検索..."
                            aria-label="タスク検索"
                        />
                        <button className="btn btn-outline-secondary">検索</button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h5 className="card-title">タスク一覧</h5>
                    </div>
                    <div className="card-body">
                        {loading && (
                            <div className="text-center my-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">読み込み中...</span>
                                </div>
                                <p className="mt-2">タスク一覧を読み込んでいます...</p>
                            </div>
                        )}

                        {error && (
                            <div className="text-danger mb-3">
                                {error}
                            </div>
                        )}

                        {!loading && !error && tasks.length === 0 && (
                            <div className="text-info mb-3">
                                タスクがありません。
                            </div>
                        )}

                        {!loading && !error && tasks.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-striped table-hover">
                                    <thead>
                                    <tr>
                                        <th>名前</th>
                                        <th>セッション</th>
                                        <th>ステータス</th>
                                        <th>作成日時</th>
                                        <th>更新日時</th>
                                        <th>操作</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tasks.slice().reverse().map((task) => (
                                        <tr key={task.id}>
                                            <td><strong>{task.title}</strong></td>
                                            <td>
                                                {sessions[task.session] ? (
                                                    <span className="badge bg-info text-dark">
                                                        {sessions[task.session]?.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">不明</span>
                                                )}
                                            </td>
                                            <td>
                          <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                            {task.status}
                          </span>
                                            </td>
                                            <td>{formatDate(task.createdAt)}</td>
                                            <td>{formatDate(task.updatedAt)}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary me-1"
                                                    onClick={() => handleDetails(task.id)}
                                                >
                                                    詳細
                                                </button>
                                                {task.status.toUpperCase() === 'RUNNING' && (
                                                    <button
                                                        className="btn btn-sm btn-outline-warning me-1"
                                                        onClick={() => handlePause(task.id, task.title)}
                                                    >
                                                        一時停止
                                                    </button>
                                                )}
                                                {task.status.toUpperCase() === 'PAUSED' && (
                                                    <button
                                                        className="btn btn-sm btn-outline-success me-1"
                                                        onClick={() => handleResume(task.id, task.title)}
                                                    >
                                                        再開
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-outline-secondary me-1"
                                                    onClick={() => handleEdit(task.id)}
                                                >
                                                    編集
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDelete(task.id, task.title)}
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <nav aria-label="タスク一覧ページネーション">
                            <ul className="pagination justify-content-center">
                                <li className="page-item disabled">
                                    <a className="page-link" href="#" tabIndex={-1} aria-disabled="true">前へ</a>
                                </li>
                                <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                <li className="page-item"><a className="page-link" href="#">2</a></li>
                                <li className="page-item"><a className="page-link" href="#">3</a></li>
                                <li className="page-item">
                                    <a className="page-link" href="#">次へ</a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
