import { useEffect, useRef, useState, useCallback } from "react";
import { Client, StompConfig, IMessage, IFrame } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface StompMessage {
  type: string;
  sessionId?: string;
  workspaceId?: string;
  status?: string;
  health?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface UseStompWebSocketProps {
  brokerURL: string;
  onMessage?: (destination: string, message: StompMessage) => void;
  onSessionStatusChange?: (message: StompMessage) => void;
  onSessionCreated?: (message: StompMessage) => void;
  onWorkspaceStatusChange?: (message: StompMessage) => void;
  onWorkspaceCreated?: (message: StompMessage) => void;
  subscriptions?: string[];
  debug?: boolean;
}

export const useStompWebSocket = ({
  brokerURL,
  onMessage,
  onSessionStatusChange,
  onSessionCreated,
  onWorkspaceStatusChange,
  onWorkspaceCreated,
  subscriptions = ["/topic/sessions", "/topic/workspaces"],
  debug = false,
}: UseStompWebSocketProps) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<{ [key: string]: any }>({});

  const handleMessage = useCallback((destination: string, message: IMessage) => {
    try {
      const stompMessage = JSON.parse(message.body) as StompMessage;

      if (debug) {
        console.log(`Received message on ${destination}:`, stompMessage);
      }

      // Call generic message handler
      onMessage?.(destination, stompMessage);

      // Call specific handlers based on message type
      switch (stompMessage.type) {
        case "session_status_change":
          onSessionStatusChange?.(stompMessage);
          break;
        case "session_created":
          onSessionCreated?.(stompMessage);
          break;
        case "workspace_status_change":
          onWorkspaceStatusChange?.(stompMessage);
          break;
        case "workspace_created":
          onWorkspaceCreated?.(stompMessage);
          break;
      }
    } catch (e) {
      console.error("Failed to parse STOMP message:", e);
    }
  }, [onMessage, onSessionStatusChange, onSessionCreated, onWorkspaceStatusChange, onWorkspaceCreated, debug]);

  const connect = useCallback(() => {
    if (clientRef.current?.connected) {
      return;
    }

    // Create SockJS connection
    const socket = new SockJS(brokerURL);

    const stompConfig: StompConfig = {
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: debug ? (str: string) => console.log(str) : undefined,
      onConnect: (frame: IFrame) => {
        console.log("STOMP connected:", frame);
        setConnected(true);
        setError(null);

        // Subscribe to topics
        subscriptions.forEach((subscription) => {
          if (clientRef.current) {
            const sub = clientRef.current.subscribe(subscription, (message) => {
              handleMessage(subscription, message);
            });
            subscriptionsRef.current[subscription] = sub;
          }
        });
      },
      onDisconnect: (frame: IFrame) => {
        console.log("STOMP disconnected:", frame);
        setConnected(false);
        subscriptionsRef.current = {};
      },
      onStompError: (frame: IFrame) => {
        console.error("STOMP error:", frame);
        setError(`STOMP error: ${frame.headers["message"]}`);
      },
      onWebSocketError: (event: Event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      },
    };

    const client = new Client(stompConfig);
    clientRef.current = client;

    try {
      client.activate();
    } catch (e) {
      console.error("Failed to activate STOMP client:", e);
      setError("Failed to connect to WebSocket");
    }
  }, [brokerURL, subscriptions, handleMessage, debug]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      // Unsubscribe from all topics
      Object.values(subscriptionsRef.current).forEach((subscription) => {
        subscription.unsubscribe();
      });
      subscriptionsRef.current = {};

      // Deactivate client
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    setConnected(false);
  }, []);

  const subscribe = useCallback((destination: string, callback?: (message: StompMessage) => void) => {
    if (clientRef.current?.connected) {
      const subscription = clientRef.current.subscribe(destination, (message) => {
        try {
          const stompMessage = JSON.parse(message.body) as StompMessage;
          callback?.(stompMessage);
          handleMessage(destination, message);
        } catch (e) {
          console.error("Failed to parse subscription message:", e);
        }
      });

      subscriptionsRef.current[destination] = subscription;
      return subscription;
    } else {
      console.warn("STOMP client is not connected. Cannot subscribe to:", destination);
      return null;
    }
  }, [handleMessage]);

  const unsubscribe = useCallback((destination: string) => {
    if (subscriptionsRef.current[destination]) {
      subscriptionsRef.current[destination].unsubscribe();
      delete subscriptionsRef.current[destination];
    }
  }, []);

  const sendMessage = useCallback((destination: string, message: any) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(message),
      });
    } else {
      console.warn("STOMP client is not connected. Cannot send message to:", destination);
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
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
  };
};