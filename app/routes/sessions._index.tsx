import {useEffect, useState} from "react";
import type {MetaFunction} from "@remix-run/node";
import Layout from "~/components/Layout";
import {apiDelete, getSessions} from "~/utils/api";
import {ClientState, useClient} from "~/components/Client";
import {Session} from "~/types";

export const meta: MetaFunction = () => {
    return [
        {title: "keruta管理パネル - セッション管理"},
        {name: "description", content: "セッションの一覧・詳細・新規作成・編集・削除"},
    ];
};

// Remove local Session interface - using the one from types

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
        default:
            return "bg-secondary";
    }
}

// 日時のフォーマット関数
function formatDate(dateString: string): string {
    if (!dateString) return "未設定";
    
    try {
        // ISO文字列や様々な形式に対応
        const date = new Date(dateString);
        
        // 無効な日付をチェック
        if (isNaN(date.getTime())) {
            return "無効な日付";
        }
        
        return date.toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch (error) {
        console.error("日付のフォーマットエラー:", error, "dateString:", dateString);
        return "日付エラー";
    }
}

export default function Sessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const clientState = useClient()

    // セッション一覧を取得する関数
    const fetchSessions = async (clientState: ClientState) => {
        console.debug("fetch sessions")
        if (clientState.state == "loading") return
        console.debug("fetch sessions 2")
        try {
            setLoading(true);
            // Use the getSessions function which now uses the server-side API proxy route
            const data = await getSessions(clientState);
            console.debug("fetch sessions 3")
            setSessions(data);
            setError(null);
        } catch (err) {
            console.error("セッション一覧の取得に失敗しました:", err);
            setError("セッション一覧の取得に失敗しました。");
        } finally {
            console.debug("finally")
            setLoading(false);
        }
    };

    // コンポーネントのマウント時にセッション一覧を取得
    useEffect(() => {
        fetchSessions(clientState);
    }, [clientState]);

    // 更新ボタンのクリックハンドラ
    const handleRefresh = () => {
        fetchSessions(clientState);
    };

    // セッション削除のハンドラ
    const handleDelete = async (sessionId: string, sessionName: string) => {
        if (clientState.state === "loading") return;

        if (window.confirm(`セッション「${sessionName}」を削除してもよろしいですか？`)) {
            try {
                await apiDelete(clientState, `sessions/${sessionId}`);
                // 削除成功後、セッション一覧を再取得
                fetchSessions(clientState);
            } catch (err) {
                console.error("セッションの削除に失敗しました:", err);
            }
        }
    };

    // セッション編集ページへの遷移ハンドラ
    const handleEdit = (sessionId: string) => {
        window.location.href = `/sessions/edit/${sessionId}`;
    };

    // セッション詳細ページへの遷移ハンドラ
    const handleDetails = (sessionId: string) => {
        window.location.href = `/sessions/${sessionId}`;
    };

    return (
        <Layout>
            <div className="sessions">
                <h2>セッション管理</h2>

                <div className="d-flex justify-content-between mb-3">
                    <div>
                        <button className="btn btn-primary me-2" onClick={() => window.location.href = "/sessions/new"}>新規セッション作成</button>
                        <button className="btn btn-outline-secondary" onClick={handleRefresh}>更新</button>
                    </div>
                    <div className="d-flex">
                        <input
                            type="text"
                            className="form-control me-2"
                            placeholder="セッション検索..."
                            aria-label="セッション検索"
                        />
                        <button className="btn btn-outline-secondary">検索</button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h5 className="card-title">セッション一覧</h5>
                    </div>
                    <div className="card-body">
                        {loading && (
                            <div className="text-center my-3">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">読み込み中...</span>
                                </div>
                                <p className="mt-2">セッション一覧を読み込んでいます...</p>
                            </div>
                        )}

                        {error && (
                            <div className="text-danger mb-3">
                                {error}
                            </div>
                        )}

                        {!loading && !error && sessions.length === 0 && (
                            <div className="text-info mb-3">
                                セッションがありません。
                            </div>
                        )}

                        {!loading && !error && sessions.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-striped table-hover">
                                    <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>名前</th>
                                        <th>説明</th>
                                        <th>ステータス</th>
                                        <th>Terraformテンプレート</th>
                                        <th>タグ</th>
                                        <th>作成日時</th>
                                        <th>更新日時</th>
                                        <th>操作</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {sessions.map((session) => (
                                        <tr key={session.id}>
                                            <td>{session.id}</td>
                                            <td>{session.name}</td>
                                            <td>{session.description || "なし"}</td>
                                            <td>
                          <span className={`badge ${getStatusBadgeClass(session.status)}`}>
                            {session.status}
                          </span>
                                            </td>
                                            <td>
                                                {session.terraformTemplateConfig ? (
                                                    <div className="small">
                                                        {session.terraformTemplateConfig.enabled ? (
                                                            <span className="badge bg-success text-white me-1">
                                                                Terraform有効
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-secondary text-white me-1">
                                                                Terraform無効
                                                            </span>
                                                        )}
                                                        {session.terraformTemplateConfig.storageClassName && (
                                                            <span className="badge bg-info text-dark me-1">
                                                                {session.terraformTemplateConfig.storageClassName}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">なし</span>
                                                )}
                                            </td>
                                            <td>
                                                {session.tags.length > 0 ? (
                                                    session.tags.map((tag, index) => (
                                                        <span key={index} className="badge bg-light text-dark me-1">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-muted">なし</span>
                                                )}
                                            </td>
                                            <td>{formatDate(session.createdAt)}</td>
                                            <td>{formatDate(session.updatedAt)}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary me-1"
                                                    onClick={() => handleDetails(session.id)}
                                                >
                                                    詳細
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary me-1"
                                                    onClick={() => handleEdit(session.id)}
                                                >
                                                    編集
                                                </button>
                                                {session.terraformTemplateConfig?.enabled && session.terraformTemplateConfig?.templatePath && (
                                                    <button
                                                        className="btn btn-sm btn-outline-info me-1"
                                                        onClick={() => window.location.href = `/sessions/edit/${session.id}#template-editor`}
                                                        title="main.tf編集"
                                                    >
                                                        <i className="bi bi-file-code"></i>
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDelete(session.id, session.name)}
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

                        <nav aria-label="セッション一覧ページネーション">
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