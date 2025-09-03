import { useState } from "react";
import { GitPublicKey } from "~/types";

interface GitPublicKeyDisplayProps {
  publicKey: GitPublicKey;
  showActions?: boolean;
  onEdit?: (key: GitPublicKey) => void;
  onDelete?: (keyId: string) => void;
  onToggleStatus?: (keyId: string, isActive: boolean) => void;
}

export default function GitPublicKeyDisplay({ 
  publicKey, 
  showActions = false,
  onEdit,
  onDelete,
  onToggleStatus
}: GitPublicKeyDisplayProps) {
  const [showFullKey, setShowFullKey] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  const formatKeyType = (keyType: string) => {
    return keyType === 'SSH' ? 'SSH鍵' : 'GPG鍵';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const truncateKey = (key: string, maxLength: number = 50) => {
    return key.length > maxLength ? key.substring(0, maxLength) + '...' : key;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-1">
              <i className="bi bi-key me-2"></i>
              {publicKey.name}
            </h6>
            <div>
              <span className={`badge ${publicKey.keyType === 'SSH' ? 'bg-primary' : 'bg-info'} me-2`}>
                {formatKeyType(publicKey.keyType)}
              </span>
              <span className={`badge ${publicKey.isActive ? 'bg-success' : 'bg-secondary'}`}>
                {publicKey.isActive ? '有効' : '無効'}
              </span>
            </div>
          </div>
          {showActions && (
            <div className="btn-group" role="group">
              {onEdit && (
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => onEdit(publicKey)}
                  title="編集"
                >
                  <i className="bi bi-pencil"></i>
                </button>
              )}
              {onToggleStatus && (
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onToggleStatus(publicKey.id, !publicKey.isActive)}
                  title={publicKey.isActive ? "無効化" : "有効化"}
                >
                  <i className={`bi ${publicKey.isActive ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              )}
              {onDelete && (
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(publicKey.id)}
                  title="削除"
                >
                  <i className="bi bi-trash"></i>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <strong>アルゴリズム:</strong>
              <p className="mb-1">
                <code>{publicKey.algorithm}</code>
                {publicKey.keySize && <span className="text-muted ms-2">({publicKey.keySize}bit)</span>}
              </p>
            </div>
            
            <div className="mb-3">
              <strong>フィンガープリント:</strong>
              <div className="d-flex align-items-center">
                <code className="small text-break flex-grow-1">{publicKey.fingerprint}</code>
                <button 
                  className="btn btn-sm btn-outline-secondary ms-2"
                  onClick={() => copyToClipboard(publicKey.fingerprint)}
                  title="コピー"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="mb-3">
              <strong>作成日時:</strong>
              <p className="mb-1 small text-muted">{formatDate(publicKey.createdAt)}</p>
            </div>
            
            {publicKey.lastUsed && (
              <div className="mb-3">
                <strong>最終使用:</strong>
                <p className="mb-1 small text-muted">{formatDate(publicKey.lastUsed)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>公開鍵:</strong>
            <div>
              <button 
                className="btn btn-sm btn-outline-secondary me-2"
                onClick={() => setShowFullKey(!showFullKey)}
              >
                <i className={`bi ${showFullKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                {showFullKey ? '省略表示' : '全体表示'}
              </button>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => copyToClipboard(publicKey.publicKey)}
              >
                <i className="bi bi-clipboard me-1"></i>
                コピー
              </button>
            </div>
          </div>
          
          {showFullKey ? (
            <textarea 
              className="form-control font-monospace small"
              rows={6}
              readOnly
              value={publicKey.publicKey}
            />
          ) : (
            <div className="border p-2 rounded bg-light">
              <code className="small text-muted">
                {truncateKey(publicKey.publicKey, 80)}
              </code>
            </div>
          )}
        </div>

        {publicKey.associatedRepositories.length > 0 && (
          <div className="mb-3">
            <strong>関連リポジトリ ({publicKey.associatedRepositories.length}件):</strong>
            <div className="mt-2">
              {publicKey.associatedRepositories.map((repo, index) => (
                <span key={index} className="badge bg-light text-dark me-2 mb-1">
                  <i className="bi bi-github me-1"></i>
                  {repo}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-muted small">
          <i className="bi bi-info-circle me-1"></i>
          このキーを使用してGitリポジトリにアクセスできます。
        </div>
      </div>
    </div>
  );
}