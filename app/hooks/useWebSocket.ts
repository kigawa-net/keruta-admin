import { useEffect, useRef, useState, useCallback } from "react";

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  workspaceId?: string;
  status?: string;
  health?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface UseWebSocketProps {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onSessionStatusChange?: (message: WebSocketMessage) => void;
  onSessionCreated?: (message: WebSocketMessage) => void;
  onWorkspaceStatusChange?: (message: WebSocketMessage) => void;
  onWorkspaceCreated?: (message: WebSocketMessage) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  onSessionStatusChange,
  onSessionCreated,
  onWorkspaceStatusChange,
  onWorkspaceCreated,
  autoReconnect = true,
  reconnectDelay = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketProps) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const clientRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const client = new WebSocket(url);

      client.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
        setError(null);
        setReconnectAttempts(0);
      };

      client.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;

          // Call generic message handler
          onMessage?.(message);

          // Call specific handlers based on message type
          switch (message.type) {
            case "session_status_change":
              onSessionStatusChange?.(message);
              break;
            case "session_created":
              onSessionCreated?.(message);
              break;
            case "workspace_status_change":
              onWorkspaceStatusChange?.(message);
              break;
            case "workspace_created":
              onWorkspaceCreated?.(message);
              break;
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      client.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setConnected(false);

        if (!event.wasClean && autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectDelay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError("Max reconnection attempts reached");
        }
      };

      client.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

      clientRef.current = client;
    } catch (e) {
      console.error("Failed to create WebSocket connection:", e);
      setError("Failed to create WebSocket connection");
    }
  }, [url, onMessage, onSessionStatusChange, onSessionCreated, onWorkspaceStatusChange, onWorkspaceCreated, autoReconnect, reconnectDelay, maxReconnectAttempts, reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (clientRef.current) {
      clientRef.current.close(1000, "Manual disconnect");
      clientRef.current = null;
    }

    setConnected(false);
    setReconnectAttempts(0);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (clientRef.current?.readyState === WebSocket.OPEN) {
      clientRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Cannot send message:", message);
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
  };
};