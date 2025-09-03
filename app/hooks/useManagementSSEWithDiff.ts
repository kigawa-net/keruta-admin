/**
 * Enhanced Management SSE Hook with Log Diff Support
 *
 * Extends the management SSE functionality with differential log updates across all sessions
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ClientState } from "~/components/Client";
import { TaskLog, SessionLog } from "~/types";
import { useLogCache } from "~/hooks/useLogCache";
import { getAllLogsDiff } from "~/utils/api";
import { LogDiff, hasLogChanges } from "~/utils/logDiff";

export interface ManagementSSEEvent {
  type: 'session_update' | 'session_created' | 'session_deleted' | 
        'task_update' | 'task_created' | 'task_deleted' |
        'log_created' | 'system_update' | 'log_diff_available';
  entityId: string;
  data: any;
  timestamp: number;
}

export interface UseManagementSSEWithDiffProps {
  clientState: ClientState;
  onSessionUpdate?: (data: any) => void;
  onSessionCreated?: (data: any) => void;
  onSessionDeleted?: (id: string) => void;
  onTaskUpdate?: (data: any) => void;
  onTaskCreated?: (data: any) => void;
  onTaskDeleted?: (id: string) => void;
  onLogCreated?: (data: any) => void;
  onSystemUpdate?: (data: any) => void;
  onEvent?: (event: ManagementSSEEvent) => void;
  onLogDiffReceived?: (diff: LogDiff) => void;
  pollInterval?: number;
  enableLogPolling?: boolean;
  enableGlobalLogCache?: boolean;
}

export function useManagementSSEWithDiff({
  clientState,
  onSessionUpdate,
  onSessionCreated,
  onSessionDeleted,
  onTaskUpdate,
  onTaskCreated,
  onTaskDeleted,
  onLogCreated,
  onSystemUpdate,
  onEvent,
  onLogDiffReceived,
  pollInterval = 10000,
  enableLogPolling = true,
  enableGlobalLogCache = true
}: UseManagementSSEWithDiffProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000;

  // Global log cache for all sessions
  const globalLogCache = useLogCache({
    maxEntries: 5000,
    retainPeriodMs: 48 * 60 * 60 * 1000, // 48 hours
    autoOptimize: true,
    optimizeInterval: 10 * 60 * 1000 // 10 minutes
  });

  // Poll for global log diffs
  const pollGlobalLogDiffs = useCallback(async () => {
    if (clientState.state === "loading" || !enableGlobalLogCache) {
      return;
    }

    try {
      const query = globalLogCache.createQuery({
        limit: 500
      });
      const diff = await getAllLogsDiff(clientState, query);
      
      if (hasLogChanges(diff)) {
        globalLogCache.applyDiff(diff);
        onLogDiffReceived?.(diff);
        
        // Trigger individual log created events for added logs
        diff.added.forEach(log => {
          onLogCreated?.(log);
        });
      }
    } catch (error) {
      console.warn('Failed to poll global log diffs:', error);
    }
  }, [clientState, enableGlobalLogCache, globalLogCache, onLogDiffReceived, onLogCreated]);

  // Schedule global log polling
  useEffect(() => {
    if (!enableLogPolling || !enableGlobalLogCache) {
      return;
    }

    const schedulePoll = () => {
      pollTimeoutRef.current = setTimeout(() => {
        pollGlobalLogDiffs().finally(() => {
          schedulePoll();
        });
      }, pollInterval);
    };

    // Initial poll
    pollGlobalLogDiffs().finally(() => {
      schedulePoll();
    });

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [enableLogPolling, enableGlobalLogCache, pollInterval, pollGlobalLogDiffs]);

  const handleEvent = useCallback((eventType: ManagementSSEEvent['type'], data: any, entityId: string) => {
    const event: ManagementSSEEvent = {
      type: eventType,
      entityId,
      data,
      timestamp: Date.now()
    };

    setLastEventTime(event.timestamp);
    onEvent?.(event);

    // Call specific handlers
    switch (eventType) {
      case 'session_update':
        onSessionUpdate?.(data);
        break;
      case 'session_created':
        onSessionCreated?.(data);
        break;
      case 'session_deleted':
        onSessionDeleted?.(entityId);
        break;
      case 'task_update':
        onTaskUpdate?.(data);
        break;
      case 'task_created':
        onTaskCreated?.(data);
        break;
      case 'task_deleted':
        onTaskDeleted?.(entityId);
        break;
      case 'log_created':
        // Add to global cache immediately
        if (enableGlobalLogCache) {
          globalLogCache.addLog(data);
        }
        onLogCreated?.(data);
        break;
      case 'system_update':
        onSystemUpdate?.(data);
        break;
      case 'log_diff_available':
        // Trigger immediate diff poll when server indicates new logs
        if (enableGlobalLogCache) {
          pollGlobalLogDiffs();
        }
        break;
    }
  }, [onSessionUpdate, onSessionCreated, onSessionDeleted, onTaskUpdate, onTaskCreated, onTaskDeleted, onLogCreated, onSystemUpdate, onEvent, enableGlobalLogCache, globalLogCache, pollGlobalLogDiffs]);

  const connect = useCallback(() => {
    if (clientState.state === "loading" || !clientState.apiUrl) {
      return;
    }

    // Close existing connection
    disconnect();

    try {
      const url = new URL(`${clientState.apiUrl}/api/v1/management/realtime`);
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Enhanced Management SSE connection opened');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent(data.type, data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse enhanced management SSE message:', err);
        }
      };

      // Session events
      eventSource.addEventListener('session_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('session_update', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse session update event:', err);
        }
      });

      eventSource.addEventListener('session_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('session_created', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse session created event:', err);
        }
      });

      eventSource.addEventListener('session_deleted', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('session_deleted', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse session deleted event:', err);
        }
      });

      // Task events
      eventSource.addEventListener('task_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('task_update', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse task update event:', err);
        }
      });

      eventSource.addEventListener('task_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('task_created', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse task created event:', err);
        }
      });

      eventSource.addEventListener('task_deleted', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('task_deleted', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse task deleted event:', err);
        }
      });

      // Log events
      eventSource.addEventListener('log_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('log_created', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse log created event:', err);
        }
      });

      eventSource.addEventListener('log_diff_available', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('log_diff_available', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse log diff available event:', err);
        }
      });

      // System events
      eventSource.addEventListener('system_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent('system_update', data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse system update event:', err);
        }
      });

      eventSource.onerror = (event) => {
        console.error('Enhanced Management SSE error:', event);
        setConnected(false);
        setError('Enhanced Management SSE connection failed');
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect Enhanced Management SSE (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          setError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        }
      };

    } catch (err) {
      console.error('Failed to create enhanced management SSE connection:', err);
      setError('Failed to create enhanced management SSE connection');
    }
  }, [clientState, handleEvent]);

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

  const refreshGlobalLogCache = useCallback(async () => {
    if (!enableGlobalLogCache) return;
    
    try {
      setError(null);
      // Force a diff poll to refresh the global cache
      await pollGlobalLogDiffs();
    } catch (err) {
      console.error('Failed to refresh global log cache:', err);
      setError('Failed to refresh global log cache');
    }
  }, [enableGlobalLogCache, pollGlobalLogDiffs]);

  return {
    connected,
    error,
    lastEventTime,
    reconnect,
    disconnect,
    refreshGlobalLogCache,
    
    // Expose global log cache functionality (if enabled)
    globalLogs: enableGlobalLogCache ? globalLogCache.logs : [],
    globalLogStats: enableGlobalLogCache ? globalLogCache.stats : undefined,
    clearGlobalLogs: enableGlobalLogCache ? globalLogCache.clear : () => {},
    optimizeGlobalLogs: enableGlobalLogCache ? globalLogCache.optimize : () => {},
    
    // Global log utility functions
    hasGlobalLog: enableGlobalLogCache ? globalLogCache.hasLog : () => false,
    getGlobalLog: enableGlobalLogCache ? globalLogCache.getLog : () => undefined,
    getGlobalLogsByLevel: enableGlobalLogCache ? globalLogCache.getLogsByLevel : () => [],
    getGlobalLogsBySource: enableGlobalLogCache ? globalLogCache.getLogsBySource : () => [],
    getGlobalLogsSince: enableGlobalLogCache ? globalLogCache.getLogsSince : () => []
  };
}