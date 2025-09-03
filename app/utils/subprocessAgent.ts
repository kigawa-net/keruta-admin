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

export class SubprocessAgent {
  private processes = new Map<string, ChildProcess>();
  private processStatuses = new Map<string, ProcessStatus>();
  private logCallbacks = new Set<LogStreamCallback>();
  private statusCallbacks = new Set<StatusChangeCallback>();
  private logBuffer = new Map<string, LogEntry[]>();

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

  private emitLog(log: LogEntry): void {
    // Add to buffer
    const logs = this.logBuffer.get(log.processId) || [];
    logs.push(log);
    
    // Keep buffer size manageable (last 1000 entries per process)
    if (logs.length > 1000) {
      logs.shift();
    }
    
    this.logBuffer.set(log.processId, logs);

    // Emit to callbacks
    this.logCallbacks.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        console.error('Error in log callback:', error);
      }
    });
  }

  private emitStatusChange(status: ProcessStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status callback:', error);
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

    // Clear all data
    this.processes.clear();
    this.processStatuses.clear();
    this.logBuffer.clear();
    this.logCallbacks.clear();
    this.statusCallbacks.clear();
  }
}

// Singleton instance for the application
export const subprocessAgent = new SubprocessAgent();