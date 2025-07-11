import {useEffect, useState} from "react";
import type {MetaFunction} from "@remix-run/node";
import Layout from "~/components/Layout";
import {apiGet} from "~/utils/api";
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
    createdAt: string;
    updatedAt: string;
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
    const clientState = useClient()

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

    // コンポーネントのマウント時にタスク一覧を取得
    useEffect(() => {
        fetchTasks(clientState);
    }, [clientState]);

    // 更新ボタンのクリックハンドラ
    const handleRefresh = () => {
        fetchTasks(clientState);
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
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}

                        {!loading && !error && tasks.length === 0 && (
                            <div className="alert alert-info" role="alert">
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
                                                <button className="btn btn-sm btn-outline-primary me-1">詳細</button>
                                                <button className="btn btn-sm btn-outline-secondary me-1">編集</button>
                                                <button className="btn btn-sm btn-outline-danger">削除</button>
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
