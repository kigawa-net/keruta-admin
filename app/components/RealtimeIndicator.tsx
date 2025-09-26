import React from 'react';
import { useRealtime } from '~/contexts/RealtimeContext';

interface RealtimeIndicatorProps {
  className?: string;
  showStatus?: boolean;
  compact?: boolean;
}

export default function RealtimeIndicator({
  className = '',
  showStatus = true,
  compact = false
}: RealtimeIndicatorProps) {
  const { connected, error, connectionStatus, lastEventTime, realtimeEnabled } = useRealtime();

  if (compact) {
    return (
      <div className={`d-flex align-items-center ${className}`}>
        <span className={`badge ${!realtimeEnabled ? 'bg-secondary' : connected ? 'bg-success' : 'bg-danger'}`}>
          {!realtimeEnabled ? '⚫' : connected ? '🟢' : '🔴'}
        </span>
        {showStatus && (
          <small className="text-muted ms-2">
            {!realtimeEnabled ? 'Disabled' : connected ? 'Live' : 'Disconnected'}
          </small>
        )}
      </div>
    );
  }

  return (
    <div className={`d-flex align-items-center ${className}`}>
      <span className={`badge me-2 ${!realtimeEnabled ? 'bg-secondary' : connected ? 'bg-success' : 'bg-danger'}`}>
        {!realtimeEnabled ? '⚫' : connected ? '🟢' : '🔴'}
      </span>
      {showStatus && (
        <div className="d-flex flex-column">
          <small className="text-muted">
            {!realtimeEnabled ? 'リアルタイム更新: 無効' :
             connected && !error ? 'リアルタイム更新: 接続中' :
             error ? `リアルタイム更新: エラー - ${error}` :
             'リアルタイム更新: 切断'}
          </small>
          {lastEventTime > 0 && realtimeEnabled && (
            <small className="text-muted">
              最終更新: {new Date(lastEventTime).toLocaleTimeString()}
            </small>
          )}
        </div>
      )}
    </div>
  );
}