import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { createSession } from "~/utils/api";
import { useClient } from "~/components/Client";
import { SessionTemplateConfig } from "~/types";
import SessionBasicInfo from "~/components/sessions/SessionBasicInfo";
import TagManager from "~/components/sessions/TagManager";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - 新規セッション作成" },
    { name: "description", content: "新しいセッションを作成します" },
  ];
};

export default function NewSession() {
  const navigate = useNavigate();
  const clientState = useClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [repositoryValidation, setRepositoryValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [repositoryRef, setRepositoryRef] = useState<string>("main");
  const [fetchingDefaultBranch, setFetchingDefaultBranch] = useState<boolean>(false);
  const [branchValidation, setBranchValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Template configuration uses fixed values (managed by backend environment variables)
  const [templateConfig] = useState<SessionTemplateConfig>({
    templateId: "keruta-ubuntu-22.04", // Fixed template ID - managed by backend CODER_TEMPLATE_ID
    templateName: "Keruta Ubuntu Environment",
    templatePath: "/terraform-templates/coder-workspace",
    preferredKeywords: [],
    parameters: {
      storage_class_name: "standard",
      storage_size: "10Gi",
      mount_path: "/home/coder/shared",
      claude_code_enabled: "true",
      claude_api_key: "",
      node_version: "20"
    }
  });

  // Gitリポジトリの検証関数
  const validateRepository = (url: string): { isValid: boolean; message: string } => {
    if (!url.trim()) {
      return { isValid: true, message: '' }; // 任意フィールドなので空は有効
    }

    // 基本的なURL形式チェック
    try {
      const urlObj = new URL(url);

      // プロトコルチェック
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, message: 'HTTPまたはHTTPSプロトコルを使用してください' };
      }

      // 一般的なGitホスティングサービスのチェック
      const validHosts = [
        'github.com',
        'gitlab.com',
        'bitbucket.org',
        'dev.azure.com',
        'git.sr.ht',
        'codeberg.org'
      ];

      const isValidHost = validHosts.some(host =>
        urlObj.hostname === host || urlObj.hostname.endsWith('.' + host)
      );

      // .gitで終わるかGitホスティングサービスかチェック
      if (!url.endsWith('.git') && !isValidHost) {
        return {
          isValid: false,
          message: 'GitリポジトリURLは.gitで終わるか、GitHub/GitLab/Bitbucketなどの対応サービスのURLを指定してください'
        };
      }

      return { isValid: true, message: '有効なGitリポジトリURLです' };
    } catch {
      return { isValid: false, message: '無効なURL形式です' };
    }
  };

  // デフォルトブランチを取得する関数
  const fetchDefaultBranch = async (url: string): Promise<string> => {
    try {
      // GitHubの場合
      if (url.includes('github.com')) {
        const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
        if (match) {
          const [, owner, repo] = match;
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
          if (response.ok) {
            const data = await response.json();
            return data.default_branch || 'main';
          }
        }
      }

      // GitLabの場合
      if (url.includes('gitlab.com')) {
        const match = url.match(/gitlab\.com[\/:]([^\/]+)\/([^\/\.]+)/);
        if (match) {
          const [, owner, repo] = match;
          const projectPath = encodeURIComponent(`${owner}/${repo}`);
          const response = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}`);
          if (response.ok) {
            const data = await response.json();
            return data.default_branch || 'main';
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch default branch:', error);
    }

    return 'main'; // フォールバック
  };

  // ブランチ名の検証関数
  const validateBranch = (ref: string): { isValid: boolean; message: string } => {
    if (!ref.trim()) {
      return { isValid: false, message: 'ブランチ・タグ・コミットは必須です' };
    }

    // 基本的なGitリファレンス名の規則をチェック
    // - 英数字、ハイフン、アンダースコア、ドット、スラッシュを許可
    // - 特殊文字や空白は禁止
    const validRefPattern = /^[a-zA-Z0-9._/-]+$/;
    if (!validRefPattern.test(ref)) {
      return {
        isValid: false,
        message: 'ブランチ名には英数字、ハイフン、アンダースコア、ドット、スラッシュのみ使用できます'
      };
    }

    // 先頭と末尾の特殊文字をチェック
    if (ref.startsWith('-') || ref.endsWith('-') || ref.startsWith('.') || ref.endsWith('.')) {
      return {
        isValid: false,
        message: 'ブランチ名の先頭・末尾にハイフンやドットは使用できません'
      };
    }

    // 連続する特殊文字をチェック
    if (/[.]{2,}/.test(ref) || /[-]{2,}/.test(ref)) {
      return {
        isValid: false,
        message: 'ドットやハイフンの連続使用は避けてください'
      };
    }

    // 予約語をチェック
    const reservedRefs = ['HEAD', 'refs', 'objects', 'hooks', 'config'];
    if (reservedRefs.includes(ref)) {
      return {
        isValid: false,
        message: 'このブランチ名は予約語のため使用できません'
      };
    }

    return { isValid: true, message: '有効なブランチ名です' };
  };

  // ブランチ名変更ハンドラ
  const handleBranchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const ref = event.target.value;
    const validation = validateBranch(ref);
    setBranchValidation(validation);
    setRepositoryRef(ref);
  };

  // リポジトリURL変更ハンドラ
  const handleRepositoryUrlChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    const validation = validateRepository(url);
    setRepositoryValidation(validation);

    // 有効なURLの場合、デフォルトブランチを取得
    if (validation.isValid && url.trim()) {
      setFetchingDefaultBranch(true);
      try {
        const defaultBranch = await fetchDefaultBranch(url);
        setRepositoryRef(defaultBranch);

        // フォーム内のinput要素を直接更新
        const refInput = document.getElementById('repositoryRef') as HTMLInputElement;
        if (refInput) {
          refInput.value = defaultBranch;
          // ブランチ名の検証も更新
          const validation = validateBranch(defaultBranch);
          setBranchValidation(validation);
        }
      } catch (error) {
        console.warn('Failed to update default branch:', error);
      } finally {
        setFetchingDefaultBranch(false);
      }
    }
  };

  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading") return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからセッションオブジェクトを作成
    const repositoryUrl = formData.get("repositoryUrl") as string;

    // リポジトリURLの最終検証
    if (repositoryUrl) {
      const validation = validateRepository(repositoryUrl);
      if (!validation.isValid) {
        setError(`リポジトリURL: ${validation.message}`);
        setLoading(false);
        return;
      }
    }

    // ブランチ名の最終検証
    const repositoryRefValue = formData.get("repositoryRef") as string;
    if (repositoryRefValue) {
      const branchValidation = validateBranch(repositoryRefValue);
      if (!branchValidation.isValid) {
        setError(`ブランチ・タグ・コミット: ${branchValidation.message}`);
        setLoading(false);
        return;
      }
    }
    const session = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      status: "ACTIVE", // 新規作成時は常にACTIVE
      tags: tags,
      repositoryUrl: repositoryUrl || undefined,
      repositoryRef: repositoryRefValue || "main",
      templateConfig: templateConfig,
    };

    try {
      // APIを使用してセッションを作成
      await createSession(clientState, session);
      // 成功したらセッション一覧ページに戻る
      navigate("/sessions");
    } catch (err) {
      console.error("セッションの作成に失敗しました:", err);
      setError(err instanceof Error ? err.message : "セッションの作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="new-session">
        <h2>新規セッション作成</h2>

        <SessionBasicInfo
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          onRepositoryUrlChange={handleRepositoryUrlChange}
          repositoryValidation={repositoryValidation}
          onBranchChange={handleBranchChange}
          branchValidation={branchValidation}
          fetchingDefaultBranch={fetchingDefaultBranch}
        >
          <TagManager tags={tags} onTagsChange={setTags} />
          
          <div className="mb-3">
            <div className="alert alert-info">
              <div className="d-flex align-items-center">
                <i className="bi bi-info-circle me-2"></i>
                <div>
                  <strong>ワークスペーステンプレート:</strong> 固定設定（{templateConfig.templateId}）<br/>
                  <small className="text-muted">環境変数CODER_TEMPLATE_IDで管理されています</small>
                </div>
              </div>
            </div>
          </div>
        </SessionBasicInfo>
      </div>
    </Layout>
  );
}
