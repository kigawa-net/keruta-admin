import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useClient } from '~/components/Client';
import { useManagementSSE, ManagementSSEEvent } from '~/hooks/useManagementSSE';
import { apiGet } from '~/utils/api';

interface RealtimeContextValue {
  connected: boolean;
  error: string | null;
  lastEventTime: number;
  connectionStatus: string;
  events: ManagementSSEEvent[];
  clearEvents: () => void;
  addCustomEvent: (event: ManagementSSEEvent) => void;
  realtimeEnabled: boolean;
  refreshRealtimeConfig: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [events, setEvents] = useState<ManagementSSEEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(true);
  const clientState = useClient();

  const handleEvent = useCallback((event: ManagementSSEEvent) => {
    setEvents(prevEvents => [event, ...prevEvents.slice(0, 99)]); // Keep last 100 events
    setConnectionStatus(`Last event: ${event.type} at ${new Date(event.timestamp).toLocaleTimeString()}`);
  }, []);

  const { connected, error, lastEventTime } = useManagementSSE({
    clientState,
    onEvent: handleEvent,
    realtimeEnabled
  });

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const addCustomEvent = useCallback((event: ManagementSSEEvent) => {
    setEvents(prevEvents => [event, ...prevEvents.slice(0, 99)]);
  }, []);

  const refreshRealtimeConfig = useCallback(async () => {
    if (clientState.state === "loading") return;

    try {
      const config = await apiGet(clientState, "admin/api/realtime/config");
      setRealtimeEnabled(config.enabled);
    } catch (err) {
      console.error("Failed to fetch realtime config:", err);
    }
  }, [clientState]);

  useEffect(() => {
    refreshRealtimeConfig();
  }, [refreshRealtimeConfig]);

  const value: RealtimeContextValue = {
    connected,
    error,
    lastEventTime,
    connectionStatus,
    events,
    clearEvents,
    addCustomEvent,
    realtimeEnabled,
    refreshRealtimeConfig
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}