interface SessionBasicInfoProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

export default function SessionBasicInfo({ onSubmit, loading, error, children }: SessionBasicInfoProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">セッション情報</h5>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              セッション名 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              id="name"
              name="name"
              required
              placeholder="セッション名を入力してください"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="description" className="form-label">
              説明
            </label>
            <textarea
              className="form-control"
              id="description"
              name="description"
              rows={3}
              placeholder="セッションの説明を入力してください（任意）"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="status" className="form-label">
              ステータス
            </label>
            <select className="form-select" id="status" name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">アクティブ</option>
              <option value="INACTIVE">非アクティブ</option>
              <option value="COMPLETED">完了</option>
              <option value="ARCHIVED">アーカイブ済み</option>
            </select>
          </div>

          {children}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.history.back()}
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  作成中...
                </>
              ) : (
                "セッション作成"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}