import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useActionData } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "~/components/Layout";
import { useClient } from "~/components/Client";
import { getGitPublicKeys, deleteGitPublicKey, generateGitKeyPair } from "~/utils/api";
import { GitPublicKey } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - Git公開鍵管理" },
    { name: "description", content: "Git公開鍵の一覧・表示・作成・削除管理" },
  ];
};

export default function GitKeys() {
  const clientState = useClient();
  const [keys, setKeys] = useState<GitPublicKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<GitPublicKey | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedKeyPair, setGeneratedKeyPair] = useState<{publicKey: GitPublicKey, privateKey: string} | null>(null);

  // Fetch Git public keys
  useEffect(() => {
    const fetchKeys = async () => {
      if (clientState.state === "loading") return;

      try {
        setLoading(true);
        const gitKeys = await getGitPublicKeys(clientState);
        setKeys(gitKeys);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch git public keys:", err);
        setError("Git公開鍵の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, [clientState]);

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("この公開鍵を削除しますか？")) return;

    try {
      await deleteGitPublicKey(clientState, keyId);
      setKeys(keys.filter(key => key.id !== keyId));
      if (selectedKey?.id === keyId) {
        setSelectedKey(null);
      }
    } catch (err) {
      console.error("Failed to delete git public key:", err);
      setError("公開鍵の削除に失敗しました。");
    }
  };

  const handleGenerateKeyPair = async (keyName: string, keyType: 'SSH' | 'GPG') => {
    try {
      const result = await generateGitKeyPair(clientState, keyName, keyType);
      setGeneratedKeyPair(result);
      setKeys([...keys, result.publicKey]);
      setShowGenerateModal(false);
    } catch (err) {
      console.error("Failed to generate key pair:", err);
      setError("キーペアの生成に失敗しました。");
    }
  };

  const formatKeyType = (keyType: string) => {
    return keyType === 'SSH' ? 'SSH鍵' : 'GPG鍵';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  const truncateKey = (key: string, maxLength: number = 50) => {
    return key.length > maxLength ? key.substring(0, maxLength) + '...' : key;
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
          <p className="mt-3">Git公開鍵を読み込んでいます...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="git-keys">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>
            <i className="bi bi-key me-2"></i>
            Git公開鍵管理
          </h2>
          <div>
            <button 
              className="btn btn-success me-2"
              onClick={() => setShowGenerateModal(true)}
            >
              <i className="bi bi-plus-circle me-1"></i>
              キーペア生成
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-upload me-1"></i>
              公開鍵追加
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="bi bi-list me-2"></i>
                  公開鍵一覧 ({keys.length}件)
                </h5>
              </div>
              <div className="card-body">
                {keys.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-key display-4 mb-3"></i>
                    <p>登録されている公開鍵がありません</p>
                    <p className="small">「キーペア生成」または「公開鍵追加」から公開鍵を追加してください</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>名前</th>
                          <th>種類</th>
                          <th>アルゴリズム</th>
                          <th>フィンガープリント</th>
                          <th>状態</th>
                          <th>作成日時</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map((key) => (
                          <tr 
                            key={key.id}
                            className={selectedKey?.id === key.id ? "table-active" : ""}
                            style={{ cursor: "pointer" }}
                            onClick={() => setSelectedKey(key)}
                          >
                            <td>
                              <strong>{key.name}</strong>
                            </td>
                            <td>
                              <span className={`badge ${key.keyType === 'SSH' ? 'bg-primary' : 'bg-info'}`}>
                                {formatKeyType(key.keyType)}
                              </span>
                            </td>
                            <td>
                              <code className="small">{key.algorithm}</code>
                              {key.keySize && <span className="text-muted ms-1">({key.keySize}bit)</span>}
                            </td>
                            <td>
                              <code className="small">{truncateKey(key.fingerprint, 20)}</code>
                            </td>
                            <td>
                              <span className={`badge ${key.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                {key.isActive ? '有効' : '無効'}
                              </span>
                            </td>
                            <td className="text-muted small">
                              {formatDate(key.createdAt)}
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedKey(key);
                                  }}
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteKey(key.id);
                                  }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            {selectedKey ? (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-key me-2"></i>
                    公開鍵詳細
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>名前:</strong>
                    <p className="mb-1">{selectedKey.name}</p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>種類:</strong>
                    <p className="mb-1">
                      <span className={`badge ${selectedKey.keyType === 'SSH' ? 'bg-primary' : 'bg-info'}`}>
                        {formatKeyType(selectedKey.keyType)}
                      </span>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>アルゴリズム:</strong>
                    <p className="mb-1">
                      <code>{selectedKey.algorithm}</code>
                      {selectedKey.keySize && <span className="text-muted ms-2">({selectedKey.keySize}bit)</span>}
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>フィンガープリント:</strong>
                    <p className="mb-1">
                      <code className="small text-break">{selectedKey.fingerprint}</code>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>公開鍵:</strong>
                    <textarea 
                      className="form-control font-monospace small"
                      rows={8}
                      readOnly
                      value={selectedKey.publicKey}
                    />
                    <button 
                      className="btn btn-sm btn-outline-secondary mt-2"
                      onClick={() => navigator.clipboard.writeText(selectedKey.publicKey)}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      コピー
                    </button>
                  </div>
                  
                  {selectedKey.associatedRepositories.length > 0 && (
                    <div className="mb-3">
                      <strong>関連リポジトリ:</strong>
                      <ul className="list-unstyled mt-1">
                        {selectedKey.associatedRepositories.map((repo, index) => (
                          <li key={index} className="small text-muted">
                            <i className="bi bi-github me-1"></i>
                            {repo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <strong>状態:</strong>
                    <p className="mb-1">
                      <span className={`badge ${selectedKey.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {selectedKey.isActive ? '有効' : '無効'}
                      </span>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <strong>作成日時:</strong>
                    <p className="mb-1 small text-muted">{formatDate(selectedKey.createdAt)}</p>
                  </div>
                  
                  {selectedKey.lastUsed && (
                    <div className="mb-3">
                      <strong>最終使用:</strong>
                      <p className="mb-1 small text-muted">{formatDate(selectedKey.lastUsed)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body text-center text-muted py-5">
                  <i className="bi bi-arrow-left display-6 mb-3"></i>
                  <p>公開鍵を選択して詳細を表示</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generated Key Pair Modal */}
        {generatedKeyPair && (
          <div className="modal show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-key me-2"></i>
                    キーペア生成完了
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => setGeneratedKeyPair(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>重要:</strong> 秘密鍵は一度しか表示されません。安全な場所に保存してください。
                  </div>
                  
                  <div className="mb-4">
                    <h6>公開鍵 (サーバーに保存されました):</h6>
                    <textarea 
                      className="form-control font-monospace small"
                      rows={4}
                      readOnly
                      value={generatedKeyPair.publicKey.publicKey}
                    />
                    <button 
                      className="btn btn-sm btn-outline-secondary mt-2"
                      onClick={() => navigator.clipboard.writeText(generatedKeyPair.publicKey.publicKey)}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      公開鍵をコピー
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <h6>秘密鍵 (保存してください):</h6>
                    <textarea 
                      className="form-control font-monospace small"
                      rows={8}
                      readOnly
                      value={generatedKeyPair.privateKey}
                    />
                    <button 
                      className="btn btn-sm btn-outline-secondary mt-2"
                      onClick={() => navigator.clipboard.writeText(generatedKeyPair.privateKey)}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      秘密鍵をコピー
                    </button>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setGeneratedKeyPair(null)}
                  >
                    確認しました
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}