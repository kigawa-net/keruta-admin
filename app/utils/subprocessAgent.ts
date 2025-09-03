/**
 * Subprocess Agent for Real-time Log Streaming
 * 
 * An agent that manages subprocess execution and streams their logs in real-time
 */

import { spawn, ChildProcess } from 'child_process';

export interface SubprocessConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  source: 'stdout' | 'stderr' | 'system';
  message: string;
  processId: string;
}

export interface ProcessStatus {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  exitCode?: number;
  startTime: string;
  endTime?: string;
  pid?: number;
}

export type LogStreamCallback = (log: LogEntry) => void;
export type StatusChangeCallback = (status: ProcessStatus) => void;
export type LogPatternCallback = (pattern: string, logs: LogEntry[]) => void;

export interface StreamProcessor {
  id: string;
  name: string;
  filter?: (log: LogEntry) => boolean;
  transform?: (log: LogEntry) => LogEntry;
  batchSize?: number;
  batchTimeout?: number;
  onBatch?: (logs: LogEntry[]) => void;
}

export interface LogPattern {
  id: string;
  name: string;
  pattern: RegExp;
  threshold: number;
  timeWindow: number; // milliseconds
  callback: LogPatternCallback;
}

export class SubprocessAgent {
  private processes = new Map<string, ChildProcess>();
  private processStatuses = new Map<string, ProcessStatus>();
  private logCallbacks = new Set<LogStreamCallback>();
  private statusCallbacks = new Set<StatusChangeCallback>();
  private logBuffer = new Map<string, LogEntry[]>();
  
  // Enhanced stream processing
  private streamProcessors = new Map<string, StreamProcessor>();
  private logPatterns = new Map<string, LogPattern>();
  private patternMatches = new Map<string, { logs: LogEntry[], timestamps: number[] }>();
  private processorBatches = new Map<string, { logs: LogEntry[], timeout?: NodeJS.Timeout }>();

  /**
   * Subscribe to log stream events
   */
  onLogStream(callback: LogStreamCallback): () => void {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  /**
   * Subscribe to process status changes
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Start a subprocess and stream its logs
   */
  async startProcess(config: SubprocessConfig): Promise<string> {
    const processId = this.generateProcessId();
    const startTime = new Date().toISOString();

    // Create initial status
    const status: ProcessStatus = {
      id: processId,
      command: `${config.command} ${config.args.join(' ')}`,
      status: 'running',
      startTime
    };

    try {
      // Spawn the process
      const process = spawn(config.command, config.args, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      status.pid = process.pid;
      this.processes.set(processId, process);
      this.processStatuses.set(processId, status);
      this.logBuffer.set(processId, []);

      // Emit initial status
      this.emitStatusChange(status);
      this.emitLog({
        id: this.generateLogId(),
        timestamp: startTime,
        level: 'info',
        source: 'system',
        message: `Process started: ${status.command}`,
        processId
      });

      // Handle stdout
      process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          this.emitLog({
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            level: 'info',
            source: 'stdout',
            message: line,
            processId
          });
        });
      });

      // Handle stderr
      process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          this.emitLog({
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            level: 'error',
            source: 'stderr',
            message: line,
            processId
          });
        });
      });

      // Handle process exit
      process.on('close', (code: number | null) => {
        const endTime = new Date().toISOString();
        const finalStatus: ProcessStatus = {
          ...status,
          status: code === 0 ? 'completed' : 'failed',
          exitCode: code || undefined,
          endTime
        };

        this.processStatuses.set(processId, finalStatus);
        this.emitStatusChange(finalStatus);
        this.emitLog({
          id: this.generateLogId(),
          timestamp: endTime,
          level: code === 0 ? 'info' : 'error',
          source: 'system',
          message: `Process ${code === 0 ? 'completed' : 'failed'} with exit code: ${code}`,
          processId
        });

        // Cleanup
        this.processes.delete(processId);
      });

      // Handle process errors
      process.on('error', (error: Error) => {
        const endTime = new Date().toISOString();
        const failedStatus: ProcessStatus = {
          ...status,
          status: 'failed',
          endTime
        };

        this.processStatuses.set(processId, failedStatus);
        this.emitStatusChange(failedStatus);
        this.emitLog({
          id: this.generateLogId(),
          timestamp: endTime,
          level: 'error',
          source: 'system',
          message: `Process error: ${error.message}`,
          processId
        });

        this.processes.delete(processId);
      });

      // Handle timeout if specified
      if (config.timeout) {
        setTimeout(() => {
          if (this.processes.has(processId)) {
            this.killProcess(processId);
            const timeoutStatus: ProcessStatus = {
              ...status,
              status: 'timeout',
              endTime: new Date().toISOString()
            };
            this.processStatuses.set(processId, timeoutStatus);
            this.emitStatusChange(timeoutStatus);
          }
        }, config.timeout);
      }

      return processId;
    } catch (error) {
      const failedStatus: ProcessStatus = {
        ...status,
        status: 'failed',
        endTime: new Date().toISOString()
      };
      
      this.processStatuses.set(processId, failedStatus);
      this.emitStatusChange(failedStatus);
      throw error;
    }
  }

  /**
   * Kill a running process
   */
  killProcess(processId: string): boolean {
    const process = this.processes.get(processId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.processes.has(processId) && !process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);

      this.emitLog({
        id: this.generateLogId(),
        timestamp: new Date().toISOString(),
        level: 'warn',
        source: 'system',
        message: 'Process kill signal sent',
        processId
      });

      return true;
    }
    return false;
  }

  /**
   * Get current status of a process
   */
  getProcessStatus(processId: string): ProcessStatus | undefined {
    return this.processStatuses.get(processId);
  }

  /**
   * Get all process statuses
   */
  getAllProcessStatuses(): ProcessStatus[] {
    return Array.from(this.processStatuses.values());
  }

  /**
   * Get log history for a process
   */
  getLogHistory(processId: string): LogEntry[] {
    return this.logBuffer.get(processId) || [];
  }

  /**
   * Get log history for all processes
   */
  getAllLogHistory(): LogEntry[] {
    const allLogs: LogEntry[] = [];
    for (const logs of this.logBuffer.values()) {
      allLogs.push(...logs);
    }
    return allLogs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Clear log history for a process
   */
  clearLogHistory(processId: string): void {
    this.logBuffer.set(processId, []);
  }

  /**
   * Stream processing: Filter logs by level
   */
  getLogsByLevel(level: LogEntry['level'], processId?: string): LogEntry[] {
    if (processId) {
      const logs = this.getLogHistory(processId);
      return logs.filter(log => log.level === level);
    }
    
    return this.getAllLogHistory().filter(log => log.level === level);
  }

  /**
   * Stream processing: Filter logs by source
   */
  getLogsBySource(source: LogEntry['source'], processId?: string): LogEntry[] {
    if (processId) {
      const logs = this.getLogHistory(processId);
      return logs.filter(log => log.source === source);
    }
    
    return this.getAllLogHistory().filter(log => log.source === source);
  }

  /**
   * Stream processing: Get logs within time range
   */
  getLogsInTimeRange(
    startTime: string, 
    endTime: string, 
    processId?: string
  ): LogEntry[] {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    const logs = processId ? this.getLogHistory(processId) : this.getAllLogHistory();
    
    return logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= start && logTime <= end;
    });
  }

  /**
   * Stream processing: Search logs by message content
   */
  searchLogs(query: string, processId?: string): LogEntry[] {
    const logs = processId ? this.getLogHistory(processId) : this.getAllLogHistory();
    const regex = new RegExp(query, 'i');
    
    return logs.filter(log => regex.test(log.message));
  }

  /**
   * Register a stream processor for real-time log processing
   */
  addStreamProcessor(processor: StreamProcessor): () => void {
    this.streamProcessors.set(processor.id, processor);
    
    if (processor.batchSize) {
      this.processorBatches.set(processor.id, { logs: [] });
    }
    
    return () => {
      this.removeStreamProcessor(processor.id);
    };
  }

  /**
   * Remove a stream processor
   */
  removeStreamProcessor(processorId: string): void {
    const batch = this.processorBatches.get(processorId);
    if (batch?.timeout) {
      clearTimeout(batch.timeout);
    }
    
    this.streamProcessors.delete(processorId);
    this.processorBatches.delete(processorId);
  }

  /**
   * Register a log pattern for detection and alerting
   */
  addLogPattern(pattern: LogPattern): () => void {
    this.logPatterns.set(pattern.id, pattern);
    this.patternMatches.set(pattern.id, { logs: [], timestamps: [] });
    
    return () => {
      this.removeLogPattern(pattern.id);
    };
  }

  /**
   * Remove a log pattern
   */
  removeLogPattern(patternId: string): void {
    this.logPatterns.delete(patternId);
    this.patternMatches.delete(patternId);
  }

  /**
   * Get real-time log statistics
   */
  getLogStats(processId?: string): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    bySource: Record<LogEntry['source'], number>;
    errorRate: number;
    recentActivity: { timestamp: string; count: number }[];
  } {
    const logs = processId ? this.getLogHistory(processId) : this.getAllLogHistory();
    
    const stats = {
      total: logs.length,
      byLevel: { info: 0, error: 0, warn: 0, debug: 0 } as Record<LogEntry['level'], number>,
      bySource: { stdout: 0, stderr: 0, system: 0 } as Record<LogEntry['source'], number>,
      errorRate: 0,
      recentActivity: [] as { timestamp: string; count: number }[]
    };

    // Calculate stats
    logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.bySource[log.source]++;
    });

    stats.errorRate = stats.total > 0 ? (stats.byLevel.error / stats.total) * 100 : 0;

    // Recent activity (last hour, grouped by 5-minute intervals)
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const recentLogs = logs.filter(log => new Date(log.timestamp).getTime() > hourAgo);
    
    const intervals = new Map<string, number>();
    recentLogs.forEach(log => {
      const timestamp = new Date(log.timestamp);
      const intervalKey = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        Math.floor(timestamp.getMinutes() / 5) * 5
      ).toISOString();
      
      intervals.set(intervalKey, (intervals.get(intervalKey) || 0) + 1);
    });

    stats.recentActivity = Array.from(intervals.entries())
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return stats;
  }

  /**
   * Stream processing: Get logs with advanced filtering
   */
  getFilteredLogs(options: {
    processId?: string;
    levels?: LogEntry['level'][];
    sources?: LogEntry['source'][];
    timeRange?: { start: string; end: string };
    pattern?: RegExp;
    limit?: number;
    offset?: number;
  }): LogEntry[] {
    let logs = options.processId ? this.getLogHistory(options.processId) : this.getAllLogHistory();

    // Apply filters
    if (options.levels) {
      logs = logs.filter(log => options.levels!.includes(log.level));
    }

    if (options.sources) {
      logs = logs.filter(log => options.sources!.includes(log.source));
    }

    if (options.timeRange) {
      const start = new Date(options.timeRange.start).getTime();
      const end = new Date(options.timeRange.end).getTime();
      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= start && logTime <= end;
      });
    }

    if (options.pattern) {
      logs = logs.filter(log => options.pattern!.test(log.message));
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || logs.length;
    
    return logs.slice(offset, offset + limit);
  }

  /**
   * Stream processing: Real-time log aggregation
   */
  getAggregatedLogs(options: {
    processId?: string;
    groupBy: 'level' | 'source' | 'hour' | 'minute';
    timeRange?: { start: string; end: string };
  }): Record<string, LogEntry[]> {
    let logs = options.processId ? this.getLogHistory(options.processId) : this.getAllLogHistory();

    if (options.timeRange) {
      const start = new Date(options.timeRange.start).getTime();
      const end = new Date(options.timeRange.end).getTime();
      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= start && logTime <= end;
      });
    }

    const groups: Record<string, LogEntry[]> = {};

    logs.forEach(log => {
      let key: string;
      
      switch (options.groupBy) {
        case 'level':
          key = log.level;
          break;
        case 'source':
          key = log.source;
          break;
        case 'hour':
          key = new Date(log.timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
          break;
        case 'minute':
          key = new Date(log.timestamp).toISOString().substring(0, 16); // YYYY-MM-DDTHH:mm
          break;
        default:
          key = 'unknown';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(log);
    });

    return groups;
  }

  private emitLog(log: LogEntry): void {
    // Add to buffer
    const logs = this.logBuffer.get(log.processId) || [];
    logs.push(log);
    
    // Keep buffer size manageable (last 1000 entries per process)
    if (logs.length > 1000) {
      logs.shift();
    }
    
    this.logBuffer.set(log.processId, logs);

    // Process through stream processors
    this.processLogThroughStreams(log);
    
    // Check for pattern matches
    this.checkLogPatterns(log);

    // Emit to callbacks
    this.logCallbacks.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        // Callback error handled internally
      }
    });
  }

  private processLogThroughStreams(log: LogEntry): void {
    this.streamProcessors.forEach((processor, processorId) => {
      try {
        // Apply filter if specified
        if (processor.filter && !processor.filter(log)) {
          return;
        }

        // Apply transform if specified
        const transformedLog = processor.transform ? processor.transform(log) : log;

        // Handle batching
        if (processor.batchSize) {
          const batch = this.processorBatches.get(processorId);
          if (batch) {
            batch.logs.push(transformedLog);

            // Clear existing timeout
            if (batch.timeout) {
              clearTimeout(batch.timeout);
            }

            // Check if batch is full
            if (batch.logs.length >= processor.batchSize) {
              this.flushProcessorBatch(processorId);
            } else if (processor.batchTimeout) {
              // Set timeout for batch processing
              batch.timeout = setTimeout(() => {
                this.flushProcessorBatch(processorId);
              }, processor.batchTimeout);
            }
          }
        } else if (processor.onBatch) {
          // Process immediately if no batching
          processor.onBatch([transformedLog]);
        }
      } catch (error) {
        // Stream processor error handled internally
      }
    });
  }

  private flushProcessorBatch(processorId: string): void {
    const processor = this.streamProcessors.get(processorId);
    const batch = this.processorBatches.get(processorId);
    
    if (processor && batch && batch.logs.length > 0) {
      try {
        if (processor.onBatch) {
          processor.onBatch([...batch.logs]);
        }
      } catch (error) {
        // Batch flush error handled internally
      }
      
      // Clear batch
      batch.logs = [];
      if (batch.timeout) {
        clearTimeout(batch.timeout);
        batch.timeout = undefined;
      }
    }
  }

  private checkLogPatterns(log: LogEntry): void {
    const now = Date.now();
    
    this.logPatterns.forEach((pattern, patternId) => {
      try {
        if (pattern.pattern.test(log.message)) {
          const matches = this.patternMatches.get(patternId);
          if (matches) {
            matches.logs.push(log);
            matches.timestamps.push(now);

            // Clean old matches outside time window
            const cutoff = now - pattern.timeWindow;
            let index = 0;
            while (index < matches.timestamps.length && matches.timestamps[index] < cutoff) {
              index++;
            }
            if (index > 0) {
              matches.logs.splice(0, index);
              matches.timestamps.splice(0, index);
            }

            // Check if threshold is reached
            if (matches.logs.length >= pattern.threshold) {
              pattern.callback(pattern.name, [...matches.logs]);
              
              // Reset matches after triggering
              matches.logs = [];
              matches.timestamps = [];
            }
          }
        }
      } catch (error) {
        // Pattern check error handled internally
      }
    });
  }

  private emitStatusChange(status: ProcessStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        // Status callback error handled internally
      }
    });
  }

  private generateProcessId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all processes and resources
   */
  cleanup(): void {
    // Kill all running processes
    for (const [processId] of this.processes) {
      this.killProcess(processId);
    }

    // Clear all batch timeouts
    this.processorBatches.forEach(batch => {
      if (batch.timeout) {
        clearTimeout(batch.timeout);
      }
    });

    // Clear all data
    this.processes.clear();
    this.processStatuses.clear();
    this.logBuffer.clear();
    this.logCallbacks.clear();
    this.statusCallbacks.clear();
    this.streamProcessors.clear();
    this.logPatterns.clear();
    this.patternMatches.clear();
    this.processorBatches.clear();
  }
}

// Singleton instance for the application
export const subprocessAgent = new SubprocessAgent();