import {useEffect, useState} from "react";
import type {MetaFunction} from "@remix-run/node";
import Layout from "~/components/Layout";
import {apiDelete, apiGet} from "~/utils/api";
import {ClientState, useClient} from "~/components/Client";

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
        case "RUNNING":
            return "bg-warning text-dark";
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

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<Record<string, Session>>({});
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

    // コンポーネントのマウント時にタスク一覧とセッション一覧を取得
    useEffect(() => {
        fetchSessions(clientState);
        fetchTasks(clientState);
    }, [clientState]);

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

    return (
        <Layout>
            <div className="tasks">
                <h2>タスク管理</h2>

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
                                        <th>ID</th>
                                        <th>名前</th>
                                        <th>セッション</th>
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
                                                {sessions[task.session] ? (
                                                    <span className="badge bg-info text-dark">
                                                        {sessions[task.session].name}
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
