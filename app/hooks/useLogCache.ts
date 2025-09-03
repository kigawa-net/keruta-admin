/**
 * Log Cache Hook with Diff Tracking
 *
 * Manages client-side log cache with incremental updates
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { TaskLog, SessionLog } from "~/types";
import { 
  LogState, 
  LogDiff, 
  LogQuery,
  applyLogDiff, 
  createIncrementalQuery,
  optimizeLogState,
  hasLogChanges,
  calculateDiffSize
} from "~/utils/logDiff";

export interface UseLogCacheOptions {
  maxEntries?: number;
  retainPeriodMs?: number;
  autoOptimize?: boolean;
  optimizeInterval?: number;
}

export interface UseLogCacheResult {
  // State
  logs: (TaskLog | SessionLog)[];
  loading: boolean;
  error: string | null;
  version: number;
  lastTimestamp: string | null;
  stats: {
    totalLogs: number;
    lastUpdate: Date | null;
    cacheHits: number;
    cacheMisses: number;
  };

  // Actions
  applyDiff: (diff: LogDiff) => void;
  updateLogs: (logs: (TaskLog | SessionLog)[]) => void;
  addLog: (log: TaskLog | SessionLog) => void;
  removeLog: (logId: string) => void;
  clear: () => void;
  optimize: () => void;
  createQuery: (additionalFilters?: Partial<LogQuery>) => LogQuery;
  
  // Utilities
  hasLog: (logId: string) => boolean;
  getLog: (logId: string) => (TaskLog | SessionLog) | undefined;
  getLogsByLevel: (level: string) => (TaskLog | SessionLog)[];
  getLogsBySource: (source: string) => (TaskLog | SessionLog)[];
  getLogsSince: (timestamp: string) => (TaskLog | SessionLog)[];
}

const DEFAULT_OPTIONS: Required<UseLogCacheOptions> = {
  maxEntries: 1000,
  retainPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
  autoOptimize: true,
  optimizeInterval: 10 * 60 * 1000 // 10 minutes (reduced frequency)
};

export function useLogCache(options: UseLogCacheOptions = {}): UseLogCacheResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<LogState>({
    logs: [],
    lastTimestamp: null,
    version: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const statsRef = useRef({
    lastUpdate: null as Date | null,
    cacheHits: 0,
    cacheMisses: 0
  });
  
  const optimizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-optimization
  useEffect(() => {
    if (!opts.autoOptimize) return;
    
    const scheduleOptimization = () => {
      if (optimizeTimeoutRef.current) {
        clearTimeout(optimizeTimeoutRef.current);
      }
      
      optimizeTimeoutRef.current = setTimeout(() => {
        setState(prevState => optimizeLogState(prevState, opts.maxEntries, opts.retainPeriodMs));
        scheduleOptimization();
      }, opts.optimizeInterval);
    };
    
    scheduleOptimization();
    
    return () => {
      if (optimizeTimeoutRef.current) {
        clearTimeout(optimizeTimeoutRef.current);
      }
    };
  }, [opts.autoOptimize, opts.optimizeInterval, opts.maxEntries, opts.retainPeriodMs]);

  const applyDiff = useCallback((diff: LogDiff) => {
    if (!hasLogChanges(diff)) {
      return;
    }
    
    setError(null);
    
    setState(prevState => {
      const newState = applyLogDiff(prevState, diff);
      statsRef.current.lastUpdate = new Date();
      
      // Log diff stats for debugging (reduced logging)
      if (process.env.NODE_ENV === 'development') {
        const diffSize = calculateDiffSize(diff);
        console.debug('Applied log diff:', {
          added: diffSize.addedCount,
          updated: diffSize.updatedCount,
          deleted: diffSize.deletedCount,
          version: diff.version
        });
      }
      
      return newState;
    });
  }, []);

  const updateLogs = useCallback((logs: (TaskLog | SessionLog)[]) => {
    setError(null);
    
    setState(prevState => {
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const lastTimestamp = sortedLogs.length > 0 
        ? sortedLogs[sortedLogs.length - 1].timestamp
        : null;
      
      const newState: LogState = {
        logs: sortedLogs,
        lastTimestamp,
        version: prevState.version + 1
      };
      
      statsRef.current.lastUpdate = new Date();
      return newState;
    });
  }, []);

  const addLog = useCallback((log: TaskLog | SessionLog) => {
    setError(null);
    
    setState(prevState => {
      const existingIndex = prevState.logs.findIndex(l => l.id === log.id);
      
      let logs: (TaskLog | SessionLog)[];
      if (existingIndex >= 0) {
        // Update existing log
        logs = [...prevState.logs];
        logs[existingIndex] = log;
      } else {
        // Add new log and maintain order
        logs = [...prevState.logs, log].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      
      const lastTimestamp = new Date(log.timestamp) > new Date(prevState.lastTimestamp || 0)
        ? log.timestamp
        : prevState.lastTimestamp;
      
      const newState: LogState = {
        logs,
        lastTimestamp,
        version: prevState.version + 1
      };
      
      statsRef.current.lastUpdate = new Date();
      return newState;
    });
  }, []);

  const removeLog = useCallback((logId: string) => {
    setState(prevState => {
      const logs = prevState.logs.filter(log => log.id !== logId);
      
      const newState: LogState = {
        logs,
        lastTimestamp: prevState.lastTimestamp,
        version: prevState.version + 1
      };
      
      statsRef.current.lastUpdate = new Date();
      return newState;
    });
  }, []);

  const clear = useCallback(() => {
    setState({
      logs: [],
      lastTimestamp: null,
      version: 0
    });
    
    statsRef.current = {
      lastUpdate: null,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    setError(null);
  }, []);

  const optimize = useCallback(() => {
    setState(prevState => optimizeLogState(prevState, opts.maxEntries, opts.retainPeriodMs));
  }, [opts.maxEntries, opts.retainPeriodMs]);

  const createQuery = useCallback((additionalFilters?: Partial<LogQuery>): LogQuery => {
    return createIncrementalQuery(state, additionalFilters);
  }, [state]);

  // Utility functions
  const hasLog = useCallback((logId: string): boolean => {
    const found = state.logs.some(log => log.id === logId);
    if (found) {
      statsRef.current.cacheHits++;
    } else {
      statsRef.current.cacheMisses++;
    }
    return found;
  }, [state.logs]);

  const getLog = useCallback((logId: string): (TaskLog | SessionLog) | undefined => {
    const log = state.logs.find(log => log.id === logId);
    if (log) {
      statsRef.current.cacheHits++;
    } else {
      statsRef.current.cacheMisses++;
    }
    return log;
  }, [state.logs]);

  const getLogsByLevel = useCallback((level: string): (TaskLog | SessionLog)[] => {
    return state.logs.filter(log => log.level === level);
  }, [state.logs]);

  const getLogsBySource = useCallback((source: string): (TaskLog | SessionLog)[] => {
    return state.logs.filter(log => log.source === source);
  }, [state.logs]);

  const getLogsSince = useCallback((timestamp: string): (TaskLog | SessionLog)[] => {
    const since = new Date(timestamp);
    return state.logs.filter(log => new Date(log.timestamp) > since);
  }, [state.logs]);

  return {
    // State
    logs: state.logs,
    loading,
    error,
    version: state.version,
    lastTimestamp: state.lastTimestamp,
    stats: {
      totalLogs: state.logs.length,
      lastUpdate: statsRef.current.lastUpdate,
      cacheHits: statsRef.current.cacheHits,
      cacheMisses: statsRef.current.cacheMisses
    },

    // Actions
    applyDiff,
    updateLogs,
    addLog,
    removeLog,
    clear,
    optimize,
    createQuery,

    // Utilities
    hasLog,
    getLog,
    getLogsByLevel,
    getLogsBySource,
    getLogsSince
  };
}