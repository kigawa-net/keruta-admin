import { useState, useEffect, useRef, useCallback } from "react";
import { ClientState } from "~/components/Client";

export interface ManagementSSEEvent {
  type: 'session_update' | 'session_created' | 'session_deleted' | 
        'task_update' | 'task_created' | 'task_deleted' |
        'log_created' | 'system_update';
  entityId: string;
  data: any;
  timestamp: number;
}

export interface UseManagementSSEProps {
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
}

export function useManagementSSE({
  clientState,
  onSessionUpdate,
  onSessionCreated,
  onSessionDeleted,
  onTaskUpdate,
  onTaskCreated,
  onTaskDeleted,
  onLogCreated,
  onSystemUpdate,
  onEvent
}: UseManagementSSEProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000; // 3 seconds

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
        onLogCreated?.(data);
        break;
      case 'system_update':
        onSystemUpdate?.(data);
        break;
    }
  }, [onSessionUpdate, onSessionCreated, onSessionDeleted, onTaskUpdate, onTaskCreated, onTaskDeleted, onLogCreated, onSystemUpdate, onEvent]);

  const connect = useCallback(() => {
    if (clientState.state === "loading" || !clientState.apiUrl) {
      return;
    }

    // Close existing connection
    disconnect();

    try {
      const url = new URL(`${clientState.apiUrl}/sessions/realtime/events`);
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Management SSE connection opened');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent(data.type, data.data, data.entityId);
        } catch (err) {
          console.warn('Failed to parse management SSE message:', err);
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
        console.error('Management SSE error:', event);
        setConnected(false);
        setError('Management SSE connection failed');
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect Management SSE (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          setError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        }
      };

    } catch (err) {
      console.error('Failed to create management SSE connection:', err);
      setError('Failed to create management SSE connection');
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

  return {
    connected,
    error,
    lastEventTime,
    reconnect,
    disconnect
  };
}