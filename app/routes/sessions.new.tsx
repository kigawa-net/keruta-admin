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

  // Template configuration uses fixed values from environment
  const [templateConfig] = useState<SessionTemplateConfig>({
    templateId: process.env.CODER_TEMPLATE_ID || "keruta-ubuntu-22.04",
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




  // フォーム送信ハンドラ
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state === "loading") return;

    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // フォームデータからセッションオブジェクトを作成
    const session = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      status: formData.get("status") as string || "ACTIVE",
      tags: tags,
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

        <SessionBasicInfo onSubmit={handleSubmit} loading={loading} error={error}>
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
