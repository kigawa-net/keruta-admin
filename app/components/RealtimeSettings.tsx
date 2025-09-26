import React, { useState, useEffect } from 'react';
import { useClient } from '~/components/Client';
import { useRealtime } from '~/contexts/RealtimeContext';
import { apiGet, apiPost } from '~/utils/api';

interface RealtimeConfiguration {
  enabled: boolean;
  lastModifiedAt: string;
  modifiedBy: string;
  description: string;
}

interface RealtimeSettingsProps {
  className?: string;
}

export default function RealtimeSettings({ className = '' }: RealtimeSettingsProps) {
  const [config, setConfig] = useState<RealtimeConfiguration | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientState = useClient();
  const { refreshRealtimeConfig } = useRealtime();

  const fetchConfig = async () => {
    if (clientState.state === "loading") return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiGet(clientState, "admin/api/realtime/config");
      setConfig(response);
    } catch (err) {
      console.error("Failed to fetch realtime config:", err);
      setError("設定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleRealtime = async () => {
    if (clientState.state === "loading" || !config) return;

    try {
      setSaving(true);
      setError(null);
      const response = await apiPost(clientState, "admin/api/realtime/toggle", {});
      setConfig(response.config);
      refreshRealtimeConfig();
    } catch (err) {
      console.error("Failed to toggle realtime:", err);
      setError("設定の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const setRealtimeEnabled = async (enabled: boolean) => {
    if (clientState.state === "loading") return;

    try {
      setSaving(true);
      setError(null);
      const response = await apiPost(clientState, "admin/api/realtime/config", { enabled });
      setConfig(response.config);
      refreshRealtimeConfig();
    } catch (err) {
      console.error("Failed to update realtime config:", err);
      setError("設定の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [clientState]);

  if (loading && !config) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h5 className="card-title">リアルタイム更新設定</h5>
        </div>
        <div className="card-body">
          <div className="text-center">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
            <span className="ms-2">設定を読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h5 className="card-title">リアルタイム更新設定</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {config && (
          <>
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="realtimeToggle"
                    checked={config.enabled}
                    onChange={() => toggleRealtime()}
                    disabled={saving}
                  />
                  <label className="form-check-label" htmlFor="realtimeToggle">
                    リアルタイム更新を有効化
                  </label>
                </div>
              </div>
              <div className="col-md-6 text-end">
                <span className={`badge ${config.enabled ? 'bg-success' : 'bg-secondary'}`}>
                  {config.enabled ? '有効' : '無効'}
                </span>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-12">
                <small className="text-muted">
                  <strong>状態:</strong> {config.description}
                </small>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <small className="text-muted">
                  <strong>最終更新:</strong><br />
                  {new Date(config.lastModifiedAt).toLocaleString()}
                </small>
              </div>
              <div className="col-md-6">
                <small className="text-muted">
                  <strong>更新者:</strong> {config.modifiedBy}
                </small>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${config.enabled ? 'btn-outline-success' : 'btn-success'}`}
                    onClick={() => setRealtimeEnabled(true)}
                    disabled={saving || config.enabled}
                  >
                    {saving && config.enabled ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    ) : null}
                    有効化
                  </button>
                  <button
                    type="button"
                    className={`btn ${!config.enabled ? 'btn-outline-danger' : 'btn-danger'}`}
                    onClick={() => setRealtimeEnabled(false)}
                    disabled={saving || !config.enabled}
                  >
                    {saving && !config.enabled ? (
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    ) : null}
                    無効化
                  </button>
                </div>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchConfig}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      更新中...
                    </>
                  ) : (
                    '設定を再読み込み'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}