/**
 * Enhanced Session SSE Hook with Log Diff Support
 *
 * Extends the session SSE functionality with differential log updates
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ClientState } from "~/components/Client";
import { TaskLog, SessionLog } from "~/types";
import { useLogCache } from "~/hooks/useLogCache";
import { getSessionLogsDiff, getTaskLogsDiff } from "~/utils/api";
import { LogDiff, hasLogChanges } from "~/utils/logDiff";

export interface SSEEvent {
  type: string;
  sessionId: string;
  data: any;
  timestamp: number;
}

export interface UseSessionSSEWithDiffProps {
  clientState: ClientState;
  sessionId: string | null;
  onEvent?: (event: SSEEvent) => void;
  onLogCreated?: (logData: any) => void;
  onLogDiffReceived?: (diff: LogDiff) => void;
  pollInterval?: number;
  enableLogPolling?: boolean;
}

export function useSessionSSEWithDiff({
  clientState,
  sessionId,
  onEvent,
  onLogCreated,
  onLogDiffReceived,
  pollInterval = 5000,
  enableLogPolling = true
}: UseSessionSSEWithDiffProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 5000;

  // Use log cache for diff tracking
  const logCache = useLogCache({
    maxEntries: 2000,
    autoOptimize: true
  });

  // Poll for log diffs
  const pollLogDiffs = useCallback(async () => {
    if (!sessionId || clientState.state === "loading") {
      return;
    }

    try {
      const query = logCache.createQuery();
      const diff = await getSessionLogsDiff(clientState, sessionId, query);
      
      if (hasLogChanges(diff)) {
        logCache.applyDiff(diff);
        onLogDiffReceived?.(diff);
        
        // Trigger individual log created events for added logs
        diff.added.forEach(log => {
          onLogCreated?.(log);
        });
      }
    } catch (error) {
      console.warn('Failed to poll log diffs:', error);
    }
  }, [sessionId, clientState, logCache, onLogDiffReceived, onLogCreated]);

  // Schedule polling
  useEffect(() => {
    if (!enableLogPolling || !sessionId) {
      return;
    }

    const schedulePoll = () => {
      pollTimeoutRef.current = setTimeout(() => {
        pollLogDiffs().finally(() => {
          schedulePoll();
        });
      }, pollInterval);
    };

    // Initial poll
    pollLogDiffs().finally(() => {
      schedulePoll();
    });

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [enableLogPolling, sessionId, pollInterval, pollLogDiffs]);

  const connect = useCallback(() => {
    if (clientState.state === "loading" || !clientState.apiUrl) {
      return;
    }

    // Close existing connection
    disconnect();

    try {
      const url = new URL(`${clientState.apiUrl}/api/v1/sessions/realtime/events`);
      if (sessionId) {
        url.searchParams.set('sessionId', sessionId);
      }

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('Enhanced SSE connection opened for session:', sessionId || 'all');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: event.type || 'message',
            sessionId: data.sessionId,
            data: data.data,
            timestamp: data.timestamp || Date.now()
          };
          
          onEvent?.(sseEvent);
        } catch (err) {
          console.warn('Failed to parse SSE message:', err);
        }
      };

      // Listen for specific events
      eventSource.addEventListener('connected', (event) => {
        console.log('Enhanced SSE connected event received:', event.data);
      });

      eventSource.addEventListener('session_log_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          const logData = data.data;
          
          // Add to cache immediately
          logCache.addLog(logData);
          onLogCreated?.(logData);
          
          const sseEvent: SSEEvent = {
            type: 'session_log_created',
            sessionId: data.sessionId,
            data: logData,
            timestamp: data.timestamp || Date.now()
          };
          
          onEvent?.(sseEvent);
        } catch (err) {
          console.warn('Failed to parse log creation event:', err);
        }
      });

      eventSource.addEventListener('task_log_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          const logData = data.data;
          
          // Add to cache immediately
          logCache.addLog(logData);
          onLogCreated?.(logData);
          
          const sseEvent: SSEEvent = {
            type: 'task_log_created',
            sessionId: data.sessionId,
            data: logData,
            timestamp: data.timestamp || Date.now()
          };
          
          onEvent?.(sseEvent);
        } catch (err) {
          console.warn('Failed to parse task log creation event:', err);
        }
      });

      eventSource.addEventListener('log_diff_available', (event) => {
        try {
          const data = JSON.parse(event.data);
          // Trigger immediate diff poll when server indicates new logs
          pollLogDiffs();
          
          const sseEvent: SSEEvent = {
            type: 'log_diff_available',
            sessionId: data.sessionId,
            data: data.data,
            timestamp: data.timestamp || Date.now()
          };
          
          onEvent?.(sseEvent);
        } catch (err) {
          console.warn('Failed to parse log diff available event:', err);
        }
      });

      eventSource.addEventListener('session_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: 'session_update',
            sessionId: data.sessionId,
            data: data.data,
            timestamp: data.timestamp || Date.now()
          };
          
          onEvent?.(sseEvent);
        } catch (err) {
          console.warn('Failed to parse session update event:', err);
        }
      });

      eventSource.onerror = (event) => {
        console.error('Enhanced SSE error:', event);
        setConnected(false);
        setError('Enhanced SSE connection failed');
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect Enhanced SSE (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          setError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        }
      };

    } catch (err) {
      console.error('Failed to create enhanced SSE connection:', err);
      setError('Failed to create enhanced SSE connection');
    }
  }, [clientState, sessionId, logCache, onEvent, onLogCreated, pollLogDiffs]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    
    setConnected(false);
    setError(null);
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  const refreshLogCache = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setError(null);
      // Force a diff poll to refresh the cache
      await pollLogDiffs();
    } catch (err) {
      console.error('Failed to refresh log cache:', err);
      setError('Failed to refresh log cache');
    }
  }, [sessionId, pollLogDiffs]);

  return {
    connected,
    error,
    reconnect,
    disconnect,
    refreshLogCache,
    
    // Expose log cache functionality
    logs: logCache.logs,
    logStats: logCache.stats,
    clearLogs: logCache.clear,
    optimizeLogs: logCache.optimize,
    
    // Utility functions
    hasLog: logCache.hasLog,
    getLog: logCache.getLog,
    getLogsByLevel: logCache.getLogsByLevel,
    getLogsBySource: logCache.getLogsBySource,
    getLogsSince: logCache.getLogsSince
  };
}