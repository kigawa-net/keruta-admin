interface SessionBasicInfoProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  onRepositoryUrlChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  repositoryValidation?: {
    isValid: boolean;
    message: string;
  } | null;
  onBranchChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  branchValidation?: {
    isValid: boolean;
    message: string;
  } | null;
  fetchingDefaultBranch?: boolean;
}

export default function SessionBasicInfo({ onSubmit, loading, error, children, onRepositoryUrlChange, repositoryValidation, onBranchChange, branchValidation, fetchingDefaultBranch }: SessionBasicInfoProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      const form = event.currentTarget;
      form.requestSubmit();
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title">セッション情報</h5>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit} onKeyDown={handleKeyDown}>
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
            <label htmlFor="repositoryUrl" className="form-label">
              Gitリポジトリ <span className="text-muted">(任意)</span>
            </label>
            <input
              type="url"
              className={`form-control ${
                repositoryValidation
                  ? repositoryValidation.isValid
                    ? 'is-valid'
                    : 'is-invalid'
                  : ''
              }`}
              id="repositoryUrl"
              name="repositoryUrl"
              placeholder="https://github.com/username/repository.git"
              pattern="https?://.*\.git$|https?://github\.com/.*|https?://gitlab\.com/.*|https?://bitbucket\.org/.*"
              title="有効なGitリポジトリURLを入力してください (例: https://github.com/user/repo.git)"
              onChange={onRepositoryUrlChange}
            />
            {repositoryValidation && repositoryValidation.message && (
              <div className={`${repositoryValidation.isValid ? 'valid-feedback' : 'invalid-feedback'}`}>
                {repositoryValidation.message}
              </div>
            )}
            <div className="form-text">
              GitHub、GitLab、Bitbucketなどのリポジトリに対応しています
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="repositoryRef" className="form-label">
              ブランチ・タグ・コミット <span className="text-muted">(任意)</span>
              {fetchingDefaultBranch && (
                <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
              )}
            </label>
            <input
              type="text"
              className={`form-control ${
                branchValidation
                  ? branchValidation.isValid
                    ? 'is-valid'
                    : 'is-invalid'
                  : ''
              }`}
              id="repositoryRef"
              name="repositoryRef"
              placeholder="main"
              defaultValue="main"
              pattern="^[a-zA-Z0-9._/-]+$"
              title="有効なブランチ名、タグ名、またはコミットハッシュを入力してください"
              onChange={onBranchChange}
              disabled={fetchingDefaultBranch}
            />
            {branchValidation && branchValidation.message && (
              <div className={`${branchValidation.isValid ? 'valid-feedback' : 'invalid-feedback'}`}>
                {branchValidation.message}
              </div>
            )}
            <div className="form-text">
              ブランチ名（例: main, develop）、タグ名（例: v1.0.0）、またはコミットハッシュを指定できます
              {fetchingDefaultBranch && <span className="text-muted"> - デフォルトブランチを取得中...</span>}
            </div>
          </div>

          {children}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
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