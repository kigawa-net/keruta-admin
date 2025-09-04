import {useEffect, useState} from 'react';
import {apiGet} from '~/utils/api';
import {useClient} from "~/components/Client";

// Example interface for API response
interface ExampleData {
    id: number;
    name: string;
    description: string;
}

/**
 * Example component that demonstrates how to use the API utility
 * to fetch data from the backend.
 */
export default function ExampleApiComponent() {
    const [data, setData] = useState<ExampleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const clientState = useClient()

    const fetchData = async () => {
        if (clientState.state == "loading") return
        try {
            setLoading(true);
            // Use the apiGet function from the API utility
            const result = await apiGet<ExampleData[]>(clientState, 'examples');
            setData(result);
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('データの取得中にエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch data from the backend when the component mounts
        fetchData();
    }, [clientState.state == "loading"]);

    return (
        <div className="example-api-component">
            <h3>APIデータ例</h3>

            {loading && <p>読み込み中...</p>}

            {error && (
                <div className="text-danger mb-3">
                    {error}
                    <div className="mt-2">
                        <button 
                            className="btn btn-outline-primary btn-sm" 
                            onClick={fetchData}
                            disabled={loading}
                        >
                            リトライ
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && data.length === 0 && (
                <p>データがありません。</p>
            )}

            {!loading && !error && data.length > 0 && (
                <div className="table-responsive">
                    <table className="table table-striped">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>名前</th>
                            <th>説明</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.description}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-3">
                <small className="text-muted">
                    このコンポーネントは環境変数で設定されたバックエンドAPIからデータを取得する例です。
                    <code>BACKEND_URL</code>、<code>API_VERSION</code>、<code>AUTH_TOKEN</code>の環境変数を
                    変更することでAPIの接続先を変更できます。
                </small>
            </div>
        </div>
    );
}
