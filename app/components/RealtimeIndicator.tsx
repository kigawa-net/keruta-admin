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
  const { connected, error, connectionStatus, lastEventTime } = useRealtime();

  if (compact) {
    return (
      <div className={`d-flex align-items-center ${className}`}>
        <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
          {connected ? '🟢' : '🔴'}
        </span>
        {showStatus && (
          <small className="text-muted ms-2">
            {connected ? 'Live' : 'Disconnected'}
          </small>
        )}
      </div>
    );
  }

  return (
    <div className={`d-flex align-items-center ${className}`}>
      <span className={`badge me-2 ${connected ? 'bg-success' : 'bg-danger'}`}>
        {connected ? '🟢' : '🔴'}
      </span>
      {showStatus && (
        <div className="d-flex flex-column">
          <small className="text-muted">
            {connected && !error ? 'リアルタイム更新: 接続中' : 
             error ? `リアルタイム更新: エラー - ${error}` : 
             'リアルタイム更新: 切断'}
          </small>
          {lastEventTime > 0 && (
            <small className="text-muted">
              最終更新: {new Date(lastEventTime).toLocaleTimeString()}
            </small>
          )}
        </div>
      )}
    </div>
  );
}