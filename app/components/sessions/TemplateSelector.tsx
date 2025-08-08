import { useState } from "react";
import { CoderTemplate, SessionTemplateConfig } from "~/types";

interface TemplateSelectorProps {
  templates: CoderTemplate[];
  templateLoading: boolean;
  selectedTemplateId: string;
  templateConfig: SessionTemplateConfig;
  onTemplateSelect: (templateId: string) => void;
  onTemplateConfigChange: (config: SessionTemplateConfig) => void;
}

export default function TemplateSelector({
  templates,
  templateLoading,
  selectedTemplateId,
  templateConfig,
  onTemplateSelect,
  onTemplateConfigChange
}: TemplateSelectorProps) {
  const [paramKey, setParamKey] = useState("");
  const [paramValue, setParamValue] = useState("");

  const handleAddParameter = () => {
    if (paramKey.trim() && paramValue.trim()) {
      onTemplateConfigChange({
        ...templateConfig,
        parameters: {
          ...templateConfig.parameters,
          [paramKey.trim()]: paramValue.trim()
        }
      });
      setParamKey("");
      setParamValue("");
    }
  };

  const handleRemoveParameter = (key: string) => {
    const newParameters = {...templateConfig.parameters};
    delete newParameters[key];
    onTemplateConfigChange({
      ...templateConfig,
      parameters: newParameters
    });
  };

  return (
    <div className="mb-3">
      <label className="form-label">ワークスペーステンプレート選択</label>
      <div className="card">
        <div className="card-body">
          {templateLoading ? (
            <div className="d-flex justify-content-center p-3">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">読み込み中...</span>
              </div>
              <span className="ms-2">テンプレートを読み込み中...</span>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <label htmlFor="templateSelect" className="form-label">
                  テンプレート <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  id="templateSelect"
                  value={selectedTemplateId}
                  onChange={(e) => onTemplateSelect(e.target.value)}
                  required
                >
                  <option value="">テンプレートを選択してください</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.displayName} - {template.description}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <div className="form-text text-warning">
                    利用可能なテンプレートがありません。管理者にお問い合わせください。
                  </div>
                )}
              </div>

              {selectedTemplateId && (
                <>
                  <div className="alert alert-info mb-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-info-circle me-2"></i>
                      <div>
                        <strong>選択されたテンプレート:</strong> {templateConfig.templateName}<br/>
                        <small className="text-muted">ID: {templateConfig.templateId}</small>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="templatePath" className="form-label">テンプレートパス</label>
                    <input
                      type="text"
                      className="form-control"
                      id="templatePath"
                      placeholder="."
                      value={templateConfig.templatePath}
                      onChange={(e) => onTemplateConfigChange({
                        ...templateConfig,
                        templatePath: e.target.value
                      })}
                    />
                    <div className="form-text">
                      テンプレートファイルがあるディレクトリパス（デフォルト: .）
                    </div>
                  </div>

                  {/* Template Parameters */}
                  <div className="mb-3">
                    <label className="form-label">テンプレートパラメータ</label>
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
                          onClick={handleAddParameter}
                        >
                          追加
                        </button>
                      </div>
                    </div>
                    <div className="list-group">
                      {Object.entries(templateConfig.parameters).map(([key, value]) => (
                        <div key={key} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{key}:</strong> {value}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveParameter(key)}
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Common parameters info */}
                    <div className="mt-3">
                      <div className="alert alert-light">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-lightbulb me-2 mt-1"></i>
                          <div>
                            <strong>よく使用されるパラメータ:</strong>
                            <ul className="mb-0 mt-1 small">
                              <li><code>storage_class_name</code>: ストレージクラス (例: standard)</li>
                              <li><code>storage_size</code>: ストレージサイズ (例: 10Gi)</li>
                              <li><code>mount_path</code>: マウントパス (例: /home/coder/shared)</li>
                              <li><code>claude_code_enabled</code>: Claude Code有効化 (true/false)</li>
                              <li><code>claude_api_key</code>: Claude API キー</li>
                              <li><code>node_version</code>: Node.js バージョン (18/20/22)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}