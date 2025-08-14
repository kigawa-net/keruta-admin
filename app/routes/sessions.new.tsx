import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { createSession, getCoderTemplates } from "~/utils/api";
import { useClient } from "~/components/Client";
import { CoderTemplate, SessionTemplateConfig } from "~/types";
import SessionBasicInfo from "~/components/sessions/SessionBasicInfo";
import TagManager from "~/components/sessions/TagManager";
import TemplateSelector from "~/components/sessions/TemplateSelector";

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

  // Template state
  const [templates, setTemplates] = useState<CoderTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateLoading, setTemplateLoading] = useState(false);

  // Session template configuration state
  const [templateConfig, setTemplateConfig] = useState<SessionTemplateConfig>({
    templateId: null,
    templateName: null,
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


  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      if (clientState.state == "loading") return;

      try {
        setTemplateLoading(true);
        const templatesData = await getCoderTemplates(clientState);
        console.log("Templates:", templatesData);
        setTemplates(templatesData);

        // Set default template if available
        const defaultTemplate = templatesData.find(t => !(t as any).deprecated);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setTemplateConfig(prev => ({
            ...prev,
            templateId: defaultTemplate.id,
            templateName: defaultTemplate.displayName,
            templatePath: `/templates/${defaultTemplate.name}`
          }));
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setTemplateLoading(false);
      }
    };

    loadTemplates();
  }, [clientState]);

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplateId(templateId);

    if (template) {
      setTemplateConfig(prev => ({
        ...prev,
        templateId: template.id,
        templateName: template.displayName,
        templatePath: `/templates/${template.name}`
      }));
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
    const session = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      status: formData.get("status") as string || "ACTIVE",
      tags: tags,
      repositoryRef: "main",
      templateConfig: selectedTemplateId ? templateConfig : undefined,
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
          <TemplateSelector
            templates={templates}
            templateLoading={templateLoading}
            selectedTemplateId={selectedTemplateId}
            templateConfig={templateConfig}
            onTemplateSelect={handleTemplateSelect}
            onTemplateConfigChange={setTemplateConfig}
          />
        </SessionBasicInfo>
      </div>
    </Layout>
  );
}
