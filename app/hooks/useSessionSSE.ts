import { useState, useEffect, useRef } from "react";
import { ClientState } from "~/components/Client";

export interface SSEEvent {
  type: string;
  sessionId: string;
  data: any;
  timestamp: number;
}

export interface UseSessionSSEProps {
  clientState: ClientState;
  sessionId: string | null;
  onEvent?: (event: SSEEvent) => void;
  onLogCreated?: (logData: any) => void;
}

export function useSessionSSE({ clientState, sessionId, onEvent, onLogCreated }: UseSessionSSEProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 5000; // 5 seconds

  const connect = () => {
    if (clientState.state === "loading" || !clientState.apiUrl) {
      return;
    }

    // Close existing connection
    disconnect();

    try {
      const url = new URL(`${clientState.apiUrl}/sessions/realtime/events`);
      if (sessionId) {
        url.searchParams.set('sessionId', sessionId);
      }

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('SSE connection opened for session:', sessionId || 'all');
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
        console.log('SSE connected event received:', event.data);
      });

      eventSource.addEventListener('session_log_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          onLogCreated?.(data.data);
          
          const sseEvent: SSEEvent = {
            type: 'session_log_created',
            sessionId: data.sessionId,
            data: data.data,
            timestamp: data.timestamp || Date.now()
          };
          
          onEvent?.(sseEvent);
        } catch (err) {
          console.warn('Failed to parse log creation event:', err);
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
        console.error('SSE error:', event);
        setConnected(false);
        setError('SSE connection failed');
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect SSE (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          setError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
        }
      };

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setError('Failed to create SSE connection');
    }
  };

  const disconnect = () => {
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
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [clientState, sessionId]);

  const reconnect = () => {
    reconnectAttemptsRef.current = 0;
    connect();
  };

  return {
    connected,
    error,
    reconnect,
    disconnect
  };
}