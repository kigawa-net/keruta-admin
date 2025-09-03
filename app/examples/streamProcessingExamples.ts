/**
 * SubprocessAgent Stream Processing Examples
 * 
 * This file demonstrates how to use the enhanced stream processing capabilities
 * for real-time log analysis, pattern detection, and batch processing.
 */

import { subprocessAgent, StreamProcessor, LogPattern, LogEntry } from '../utils/subprocessAgent';

// Example 1: Error Detection and Alerting
export function setupErrorDetection() {
  // Pattern to detect critical errors
  const criticalErrorPattern: LogPattern = {
    id: 'critical_errors',
    name: 'Critical Error Detection',
    pattern: /CRITICAL|FATAL|PANIC|OUT OF MEMORY/i,
    threshold: 3, // Alert after 3 critical errors
    timeWindow: 60000, // within 1 minute
    callback: (patternName, logs) => {
      console.error(`ALERT: ${patternName} triggered!`);
      console.error(`Found ${logs.length} critical errors in the last minute:`);
      logs.forEach(log => {
        console.error(`  ${log.timestamp}: ${log.message}`);
      });
      
      // Here you could integrate with alerting systems:
      // - Send email/Slack notifications
      // - Write to monitoring systems
      // - Trigger automated responses
    }
  };

  return subprocessAgent.addLogPattern(criticalErrorPattern);
}

// Example 2: Performance Monitoring Stream Processor
export function setupPerformanceMonitoring() {
  const performanceProcessor: StreamProcessor = {
    id: 'performance_monitor',
    name: 'Performance Monitor',
    filter: (log) => {
      // Only process logs that contain timing information
      return /\d+ms|\d+\.\d+s|took|duration|elapsed/i.test(log.message);
    },
    transform: (log) => {
      // Extract timing information and add metadata
      const timeMatch = log.message.match(/(\d+(?:\.\d+)?)(ms|s)/);
      return {
        ...log,
        message: `[PERF] ${log.message}`,
        metadata: {
          timing: timeMatch ? {
            value: parseFloat(timeMatch[1]),
            unit: timeMatch[2]
          } : null
        }
      } as LogEntry;
    },
    batchSize: 10,
    batchTimeout: 5000, // Process batch every 5 seconds
    onBatch: (logs) => {
      // Calculate performance statistics
      const timings: number[] = [];
      logs.forEach(log => {
        if (log.metadata?.timing) {
          const { value, unit } = log.metadata.timing;
          const ms = unit === 's' ? value * 1000 : value;
          timings.push(ms);
        }
      });

      if (timings.length > 0) {
        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        
        if (avg > 1000) {
          console.warn(`High average response time detected: ${avg.toFixed(2)}ms`);
        }
      }
    }
  };

  return subprocessAgent.addStreamProcessor(performanceProcessor);
}

// Example 3: Log Aggregation and Analysis
export async function analyzeLogData(processId?: string) {
  // Get comprehensive statistics
  const stats = subprocessAgent.getLogStats(processId);
  
  if (stats.total > 0) {
    console.log('Log Statistics:');
    console.log(`  Total logs: ${stats.total}`);
    console.log(`  Error rate: ${stats.errorRate.toFixed(2)}%`);
  }

  // Get error logs from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  
  const recentErrors = subprocessAgent.getFilteredLogs({
    processId,
    levels: ['error'],
    timeRange: { start: oneHourAgo, end: now },
    limit: 10
  });

  if (recentErrors.length > 0) {
    console.log('\nRecent Errors:');
    recentErrors.forEach(log => {
      console.log(`  ${log.timestamp}: ${log.message}`);
    });
  }

  // Aggregate logs by hour to see patterns
  const hourlyLogs = subprocessAgent.getAggregatedLogs({
    processId,
    groupBy: 'hour',
    timeRange: { start: oneHourAgo, end: now }
  });

  if (Object.keys(hourlyLogs).length > 0) {
    console.log('\nHourly Log Distribution:');
    Object.entries(hourlyLogs).forEach(([hour, logs]) => {
      const errors = logs.filter(log => log.level === 'error').length;
      console.log(`  ${hour}: ${logs.length} logs (${errors} errors)`);
    });
  }
}

// Example 4: Security Monitoring
export function setupSecurityMonitoring() {
  const securityPatterns = [
    {
      id: 'failed_auth',
      name: 'Failed Authentication',
      pattern: /authentication failed|login failed|invalid credentials|unauthorized/i,
      threshold: 5,
      timeWindow: 300000, // 5 minutes
    },
    {
      id: 'suspicious_activity',
      name: 'Suspicious Activity', 
      pattern: /sql injection|xss|malicious|brute force|ddos/i,
      threshold: 1,
      timeWindow: 60000, // 1 minute
    }
  ];

  const unsubscribeFunctions = securityPatterns.map(pattern => {
    return subprocessAgent.addLogPattern({
      ...pattern,
      callback: (patternName, logs) => {
        console.warn(`SECURITY ALERT: ${patternName}`);
        console.warn(`Detected ${logs.length} incidents:`);
        logs.forEach(log => {
          console.warn(`  [${log.source}] ${log.timestamp}: ${log.message}`);
        });
      }
    });
  });

  return () => unsubscribeFunctions.forEach(unsub => unsub());
}

// Example 5: Custom Stream Processing for Application Metrics
export function setupApplicationMetrics() {
  const metricsProcessor: StreamProcessor = {
    id: 'app_metrics',
    name: 'Application Metrics',
    filter: (log) => {
      // Process logs that contain metric information
      return /requests\/sec|memory usage|cpu usage|connections|queue size/i.test(log.message);
    },
    batchSize: 20,
    batchTimeout: 10000, // Process every 10 seconds
    onBatch: (logs) => {
      const metrics = {
        requests: 0,
        memoryUsage: [] as number[],
        cpuUsage: [] as number[],
        connections: [] as number[]
      };

      logs.forEach(log => {
        // Extract different types of metrics
        if (log.message.includes('requests/sec')) {
          const match = log.message.match(/(\d+(?:\.\d+)?)\s*requests\/sec/);
          if (match) metrics.requests += parseFloat(match[1]);
        }
        
        if (log.message.includes('memory usage')) {
          const match = log.message.match(/(\d+(?:\.\d+)?)[%MB]/);
          if (match) metrics.memoryUsage.push(parseFloat(match[1]));
        }
        
        if (log.message.includes('cpu usage')) {
          const match = log.message.match(/(\d+(?:\.\d+)?)[%]/);
          if (match) metrics.cpuUsage.push(parseFloat(match[1]));
        }
      });

      // Generate summary report only for significant metrics
      if (metrics.requests > 0 || metrics.memoryUsage.length > 0 || metrics.cpuUsage.length > 0) {
        console.log('Application Metrics Summary:');
        if (metrics.requests > 0) {
          console.log(`  Total requests processed: ${metrics.requests}`);
        }
        
        if (metrics.memoryUsage.length > 0) {
          const avgMemory = metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length;
          if (avgMemory > 80) { // Only log high memory usage
            console.log(`  Average memory usage: ${avgMemory.toFixed(2)}%`);
          }
        }
        
        if (metrics.cpuUsage.length > 0) {
          const avgCpu = metrics.cpuUsage.reduce((a, b) => a + b, 0) / metrics.cpuUsage.length;
          if (avgCpu > 70) { // Only log high CPU usage
            console.log(`  Average CPU usage: ${avgCpu.toFixed(2)}%`);
          }
        }
      }
    }
  };

  return subprocessAgent.addStreamProcessor(metricsProcessor);
}

// Example 6: Complete Monitoring Setup
export async function setupCompleteMonitoring() {
  
  // Set up all monitoring components
  const unsubscribeError = setupErrorDetection();
  const unsubscribePerf = setupPerformanceMonitoring();
  const unsubscribeSecurity = setupSecurityMonitoring();
  const unsubscribeMetrics = setupApplicationMetrics();

  // Subscribe to real-time log stream
  const unsubscribeStream = subprocessAgent.onLogStream((log) => {
    // Only log critical errors
    if (log.level === 'error' && (log.message.includes('CRITICAL') || log.message.includes('FATAL'))) {
      console.error(`Error from ${log.processId}: ${log.message}`);
    }
  });

  // Subscribe to process status changes
  const unsubscribeStatus = subprocessAgent.onStatusChange((status) => {
    if (status.status === 'failed') {
      console.error(`Process failed: ${status.command} (exit code: ${status.exitCode})`);
    }
  });

  // Return cleanup function
  return () => {
    unsubscribeError();
    unsubscribePerf();
    unsubscribeSecurity();
    unsubscribeMetrics();
    unsubscribeStream();
    unsubscribeStatus();
  };
}

// Example usage:
export async function exampleUsage() {
  // Start comprehensive monitoring
  const cleanup = await setupCompleteMonitoring();

  // Start a subprocess
  const processId = await subprocessAgent.startProcess({
    command: 'node',
    args: ['--version'],
    cwd: process.cwd()
  });

  console.log(`Started process: ${processId}`);

  // Analyze logs after some time
  setTimeout(() => {
    analyzeLogData(processId);
  }, 5000);

  // Cleanup after 30 seconds
  setTimeout(() => {
    cleanup();
    subprocessAgent.cleanup();
  }, 30000);
}