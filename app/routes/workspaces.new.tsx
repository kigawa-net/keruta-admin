import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import Layout from "~/components/Layout";
import { createWorkspace, getSessions, getWorkspaceTemplates } from "~/utils/api";
import { useClient } from "~/components/Client";
import type { Session, WorkspaceTemplate, CreateWorkspaceData } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "keruta管理パネル - 新規ワークスペース作成" },
    { name: "description", content: "新しいワークスペースを作成します" },
  ];
};

export default function NewWorkspace() {
  const navigate = useNavigate();
  const clientState = useClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [autoStartSchedule, setAutoStartSchedule] = useState("");
  const [ttlMs, setTtlMs] = useState<number | undefined>(undefined);
  const [automaticUpdates, setAutomaticUpdates] = useState(true);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  
  // Data state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (clientState.state !== "authorized") return;

      try {
        setSessionsLoading(true);
        setTemplatesLoading(true);
        
        const [sessionsData, templatesData] = await Promise.all([
          getSessions(clientState),
          getWorkspaceTemplates(clientState)
        ]);
        
        setSessions(sessionsData);
        setTemplates(templatesData);
        
        // Set default template
        const defaultTemplate = templatesData.find(t => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(err instanceof Error ? err.message : "データの読み込みに失敗しました。");
      } finally {
        setSessionsLoading(false);
        setTemplatesLoading(false);
      }
    };

    loadData();
  }, [clientState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientState.state !== "authorized") return;

    setLoading(true);
    setError(null);

    const workspaceData: CreateWorkspaceData = {
      name: name.trim(),
      sessionId: selectedSessionId,
      templateId: selectedTemplateId || undefined,
      autoStartSchedule: autoStartSchedule || undefined,
      ttlMs: ttlMs,
      automaticUpdates: automaticUpdates,
      richParameterValues: parameters,
    };

    try {
      await createWorkspace(clientState, workspaceData);
      navigate("/workspaces");
    } catch (err) {
      console.error("Failed to create workspace:", err);
      setError(err instanceof Error ? err.message : "ワークスペースの作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleParameterAdd = (key: string, value: string) => {
    if (key.trim() && value.trim()) {
      setParameters(prev => ({
        ...prev,
        [key.trim()]: value.trim()
      }));
    }
  };

  const handleParameterRemove = (key: string) => {
    setParameters(prev => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };

  if (clientState.state === "loading") {
    return (
      <Layout>
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="new-workspace">
        <h2>新規ワークスペース作成</h2>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title">ワークスペース情報</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  ワークスペース名 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="ワークスペース名を入力してください"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="sessionId" className="form-label">
                  セッション <span className="text-danger">*</span>
                </label>
                {sessionsLoading ? (
                  <div className="form-control d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">読み込み中...</span>
                    </div>
                    セッションを読み込み中...
                  </div>
                ) : (
                  <select
                    className="form-select"
                    id="sessionId"
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    required
                  >
                    <option value="">セッションを選択してください</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name} ({session.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="templateId" className="form-label">
                  ワークスペーステンプレート
                </label>
                {templatesLoading ? (
                  <div className="form-control d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">読み込み中...</span>
                    </div>
                    テンプレートを読み込み中...
                  </div>
                ) : (
                  <select
                    className="form-select"
                    id="templateId"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">デフォルトテンプレートを使用</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.description}
                        {template.isDefault && " (デフォルト)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="autoStartSchedule" className="form-label">
                    自動開始スケジュール
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="autoStartSchedule"
                    value={autoStartSchedule}
                    onChange={(e) => setAutoStartSchedule(e.target.value)}
                    placeholder="例: 0 9 * * 1-5 (平日9時)"
                  />
                  <div className="form-text">
                    Cron形式で指定してください。空白の場合は自動開始しません。
                  </div>
                </div>
                <div className="col-md-6">
                  <label htmlFor="ttlMs" className="form-label">
                    TTL (時間)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="ttlMs"
                    value={ttlMs ? Math.floor(ttlMs / 3600000) : ""}
                    onChange={(e) => setTtlMs(e.target.value ? parseInt(e.target.value) * 3600000 : undefined)}
                    placeholder="例: 8 (8時間後に自動停止)"
                    min="1"
                    max="168"
                  />
                  <div className="form-text">
                    指定時間後に自動停止します。空白の場合は無制限です。
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="automaticUpdates"
                    checked={automaticUpdates}
                    onChange={(e) => setAutomaticUpdates(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="automaticUpdates">
                    自動更新を有効にする
                  </label>
                </div>
              </div>

              {/* Parameters Section */}
              <div className="mb-3">
                <label className="form-label">テンプレートパラメータ</label>
                <ParameterManager 
                  parameters={parameters}
                  onParameterAdd={handleParameterAdd}
                  onParameterRemove={handleParameterRemove}
                />
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/workspaces")}
                  disabled={loading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !name.trim() || !selectedSessionId}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      作成中...
                    </>
                  ) : (
                    "ワークスペース作成"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Parameter Manager Component
function ParameterManager({ 
  parameters, 
  onParameterAdd, 
  onParameterRemove 
}: {
  parameters: Record<string, string>;
  onParameterAdd: (key: string, value: string) => void;
  onParameterRemove: (key: string) => void;
}) {
  const [paramKey, setParamKey] = useState("");
  const [paramValue, setParamValue] = useState("");

  const handleAdd = () => {
    if (paramKey.trim() && paramValue.trim()) {
      onParameterAdd(paramKey, paramValue);
      setParamKey("");
      setParamValue("");
    }
  };

  return (
    <div>
      <div className="row mb-2">
        <div className="col-5">
          <input
            type="text"
            className="form-control"
            placeholder="パラメータ名"
            value={paramKey}
            onChange={(e) => setParamKey(e.target.value)}
          />
        </div>
        <div className="col-5">
          <input
            type="text"
            className="form-control"
            placeholder="パラメータ値"
            value={paramValue}
            onChange={(e) => setParamValue(e.target.value)}
          />
        </div>
        <div className="col-2">
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            onClick={handleAdd}
          >
            追加
          </button>
        </div>
      </div>
      
      {Object.keys(parameters).length > 0 && (
        <div className="list-group">
          {Object.entries(parameters).map(([key, value]) => (
            <div key={key} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{key}:</strong> {value}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onParameterRemove(key)}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-2">
        <div className="alert alert-light">
          <div className="d-flex align-items-start">
            <i className="bi bi-lightbulb me-2 mt-1"></i>
            <div>
              <strong>よく使用されるパラメータ:</strong>
              <ul className="mb-0 mt-1 small">
                <li><code>cpu_request</code>: CPU要求量 (例: 0.5)</li>
                <li><code>memory_request</code>: メモリ要求量 (例: 1Gi)</li>
                <li><code>storage_size</code>: ストレージサイズ (例: 10Gi)</li>
                <li><code>image</code>: コンテナイメージ (例: ubuntu:20.04)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}