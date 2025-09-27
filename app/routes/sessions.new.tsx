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

  // リポジトリURL変更ハンドラ
  const handleRepositoryUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    const validation = validateRepository(url);
    setRepositoryValidation(validation);
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
    const session = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      status: "ACTIVE", // 新規作成時は常にACTIVE
      tags: tags,
      repositoryUrl: repositoryUrl || undefined,
      repositoryRef: "main",
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
