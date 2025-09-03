/**
 * Log Diff Utilities
 *
 * Utilities for handling incremental log updates using diffs
 */

import { TaskLog, SessionLog } from "~/types";

export interface LogState {
  logs: (TaskLog | SessionLog)[];
  lastTimestamp: string | null;
  version: number;
}

export interface LogDiff {
  added: (TaskLog | SessionLog)[];
  updated: (TaskLog | SessionLog)[];
  deleted: string[];
  lastTimestamp: string | null;
  version: number;
}

export interface LogQuery {
  since?: string;
  version?: number;
  limit?: number;
  level?: string;
  source?: string;
}

/**
 * Apply a log diff to the current log state
 */
export function applyLogDiff(currentState: LogState, diff: LogDiff): LogState {
  let logs = [...currentState.logs];
  
  // Remove deleted logs
  if (diff.deleted.length > 0) {
    logs = logs.filter(log => !diff.deleted.includes(log.id));
  }
  
  // Update existing logs
  if (diff.updated.length > 0) {
    const updateMap = new Map(diff.updated.map(log => [log.id, log]));
    logs = logs.map(log => updateMap.get(log.id) || log);
  }
  
  // Add new logs, maintaining timestamp order
  if (diff.added.length > 0) {
    logs = [...logs, ...diff.added].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  
  return {
    logs,
    lastTimestamp: diff.lastTimestamp || currentState.lastTimestamp,
    version: diff.version
  };
}

/**
 * Create a diff between two log states
 */
export function createLogDiff(
  oldLogs: (TaskLog | SessionLog)[],
  newLogs: (TaskLog | SessionLog)[],
  oldVersion: number = 0
): LogDiff {
  const oldMap = new Map(oldLogs.map(log => [log.id, log]));
  const newMap = new Map(newLogs.map(log => [log.id, log]));
  
  const added: (TaskLog | SessionLog)[] = [];
  const updated: (TaskLog | SessionLog)[] = [];
  const deleted: string[] = [];
  
  // Find added and updated logs
  for (const [id, newLog] of newMap) {
    const oldLog = oldMap.get(id);
    if (!oldLog) {
      added.push(newLog);
    } else if (JSON.stringify(oldLog) !== JSON.stringify(newLog)) {
      updated.push(newLog);
    }
  }
  
  // Find deleted logs
  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      deleted.push(id);
    }
  }
  
  const lastTimestamp = newLogs.length > 0 
    ? newLogs.reduce((latest, log) => 
        new Date(log.timestamp) > new Date(latest) ? log.timestamp : latest,
        newLogs[0].timestamp
      )
    : null;
  
  return {
    added,
    updated,
    deleted,
    lastTimestamp,
    version: oldVersion + 1
  };
}

/**
 * Check if a log diff has any changes
 */
export function hasLogChanges(diff: LogDiff): boolean {
  return diff.added.length > 0 || diff.updated.length > 0 || diff.deleted.length > 0;
}

/**
 * Merge multiple log diffs into a single diff
 */
export function mergeLogDiffs(...diffs: LogDiff[]): LogDiff {
  if (diffs.length === 0) {
    return {
      added: [],
      updated: [],
      deleted: [],
      lastTimestamp: null,
      version: 0
    };
  }
  
  if (diffs.length === 1) {
    return diffs[0];
  }
  
  const merged: LogDiff = {
    added: [],
    updated: [],
    deleted: [],
    lastTimestamp: null,
    version: Math.max(...diffs.map(d => d.version))
  };
  
  const addedMap = new Map<string, TaskLog | SessionLog>();
  const updatedMap = new Map<string, TaskLog | SessionLog>();
  const deletedSet = new Set<string>();
  
  for (const diff of diffs) {
    // Process deletions first
    for (const id of diff.deleted) {
      deletedSet.add(id);
      addedMap.delete(id);
      updatedMap.delete(id);
    }
    
    // Process additions
    for (const log of diff.added) {
      if (!deletedSet.has(log.id)) {
        addedMap.set(log.id, log);
        updatedMap.delete(log.id);
      }
    }
    
    // Process updates
    for (const log of diff.updated) {
      if (!deletedSet.has(log.id) && !addedMap.has(log.id)) {
        updatedMap.set(log.id, log);
      } else if (addedMap.has(log.id)) {
        // Update the added entry
        addedMap.set(log.id, log);
      }
    }
    
    // Track latest timestamp
    if (diff.lastTimestamp && 
        (!merged.lastTimestamp || new Date(diff.lastTimestamp) > new Date(merged.lastTimestamp))) {
      merged.lastTimestamp = diff.lastTimestamp;
    }
  }
  
  merged.added = Array.from(addedMap.values());
  merged.updated = Array.from(updatedMap.values());
  merged.deleted = Array.from(deletedSet);
  
  return merged;
}

/**
 * Create a log query for fetching incremental updates
 */
export function createIncrementalQuery(
  currentState: LogState,
  additionalFilters?: Partial<LogQuery>
): LogQuery {
  return {
    since: currentState.lastTimestamp,
    version: currentState.version,
    ...additionalFilters
  };
}

/**
 * Optimize log state by removing old entries beyond a limit
 */
export function optimizeLogState(
  state: LogState,
  maxEntries: number = 1000,
  retainPeriodMs: number = 24 * 60 * 60 * 1000 // 24 hours
): LogState {
  if (state.logs.length <= maxEntries) {
    return state;
  }
  
  const now = new Date().getTime();
  const cutoffTime = now - retainPeriodMs;
  
  // Sort logs by timestamp (newest first)
  const sortedLogs = [...state.logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Keep the most recent logs up to maxEntries
  const recentLogs = sortedLogs.slice(0, maxEntries);
  
  // Additionally keep logs within retention period
  const retainedLogs = sortedLogs.filter(log => 
    new Date(log.timestamp).getTime() > cutoffTime
  );
  
  // Combine recent and retained logs, removing duplicates
  const logMap = new Map();
  [...recentLogs, ...retainedLogs].forEach(log => {
    logMap.set(log.id, log);
  });
  
  const optimizedLogs = Array.from(logMap.values()).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return {
    logs: optimizedLogs,
    lastTimestamp: state.lastTimestamp,
    version: state.version
  };
}

/**
 * Calculate the size impact of a log diff
 */
export function calculateDiffSize(diff: LogDiff): {
  addedCount: number;
  updatedCount: number;
  deletedCount: number;
  estimatedBytes: number;
} {
  const addedCount = diff.added.length;
  const updatedCount = diff.updated.length;
  const deletedCount = diff.deleted.length;
  
  // Rough estimate: each log entry is ~200 bytes on average
  const estimatedBytes = (addedCount + updatedCount) * 200;
  
  return {
    addedCount,
    updatedCount,
    deletedCount,
    estimatedBytes
  };
}