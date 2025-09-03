import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useClient } from '~/components/Client';
import { useManagementSSE, ManagementSSEEvent } from '~/hooks/useManagementSSE';

interface RealtimeContextValue {
  connected: boolean;
  error: string | null;
  lastEventTime: number;
  connectionStatus: string;
  events: ManagementSSEEvent[];
  clearEvents: () => void;
  addCustomEvent: (event: ManagementSSEEvent) => void;
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
  const clientState = useClient();

  const handleEvent = useCallback((event: ManagementSSEEvent) => {
    setEvents(prevEvents => [event, ...prevEvents.slice(0, 99)]); // Keep last 100 events
    setConnectionStatus(`Last event: ${event.type} at ${new Date(event.timestamp).toLocaleTimeString()}`);
  }, []);

  const { connected, error, lastEventTime } = useManagementSSE({
    clientState,
    onEvent: handleEvent
  });

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const addCustomEvent = useCallback((event: ManagementSSEEvent) => {
    setEvents(prevEvents => [event, ...prevEvents.slice(0, 99)]);
  }, []);

  const value: RealtimeContextValue = {
    connected,
    error,
    lastEventTime,
    connectionStatus,
    events,
    clearEvents,
    addCustomEvent
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}