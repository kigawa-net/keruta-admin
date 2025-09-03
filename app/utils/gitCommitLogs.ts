/**
 * Git Commit Log Utilities
 *
 * Utilities for retrieving and displaying git commit failure logs from task logs
 */

import { ClientState } from "~/components/Client";
import { getTaskLogs, getSessionLogs } from "~/utils/api";
import { TaskLog, SessionLog } from "~/types";

export interface GitCommitFailure {
  timestamp: string;
  taskId: string;
  sessionId: string;
  submodulePath: string;
  commitMessage: string;
  errorOutput: string;
  workingDirectory: string;
  gitStatus?: string;
  gitLog?: string;
  gitRemote?: string;
  environment?: {
    user: string;
    hostname: string;
    pwd: string;
  };
}

/**
 * Extract git commit failure information from task logs
 */
export async function getGitCommitFailuresFromTaskLogs(
  clientState: ClientState,
  taskId: string
): Promise<GitCommitFailure[]> {
  try {
    const logs = await getTaskLogs(clientState, taskId, {
      level: "ERROR"
    });

    const gitFailureLogs = logs.filter(log => 
      log.source === "git-handler" && 
      log.message.includes("Git commit failed")
    );

    return gitFailureLogs.map(log => parseGitFailureFromTaskLog(log));
  } catch (error) {
    console.error("Failed to fetch git commit failures from task logs:", error);
    return [];
  }
}

/**
 * Extract git commit failure information from session logs
 */
export async function getGitCommitFailuresFromSessionLogs(
  clientState: ClientState,
  sessionId: string
): Promise<GitCommitFailure[]> {
  try {
    const logs = await getSessionLogs(clientState, sessionId, {
      level: "ERROR",
      source: "git-handler",
      action: "commit"
    });

    return logs.map(log => parseGitFailureFromSessionLog(log));
  } catch (error) {
    console.error("Failed to fetch git commit failures from session logs:", error);
    return [];
  }
}

/**
 * Parse git failure information from a task log entry
 */
function parseGitFailureFromTaskLog(log: TaskLog): GitCommitFailure {
  const metadata = log.metadata || {};
  
  return {
    timestamp: log.timestamp,
    taskId: log.taskId,
    sessionId: log.sessionId,
    submodulePath: metadata.submodule || "unknown",
    commitMessage: extractCommitMessage(log.message),
    errorOutput: metadata.details || log.message,
    workingDirectory: metadata.workingDirectory || "unknown",
    gitStatus: metadata.gitStatus,
    gitLog: metadata.gitLog,
    gitRemote: metadata.gitRemote,
    environment: metadata.environment
  };
}

/**
 * Parse git failure information from a session log entry
 */
function parseGitFailureFromSessionLog(log: SessionLog): GitCommitFailure {
  const metadata = log.metadata || {};
  
  return {
    timestamp: log.timestamp,
    taskId: metadata.taskId || "unknown",
    sessionId: log.sessionId,
    submodulePath: metadata.submodulePath || "unknown",
    commitMessage: metadata.commitMessage || extractCommitMessage(log.message),
    errorOutput: log.details || log.message,
    workingDirectory: metadata.workingDirectory || "unknown",
    gitStatus: metadata.gitStatus,
    gitLog: metadata.gitLog,
    gitRemote: metadata.gitRemote,
    environment: metadata.environment
  };
}

/**
 * Extract commit message from log message text
 */
function extractCommitMessage(message: string): string {
  const match = message.match(/commit message was: (.+)/i);
  return match ? match[1] : "unknown";
}

/**
 * Get all git commit failures for a session (from both task and session logs)
 */
export async function getAllGitCommitFailures(
  clientState: ClientState,
  sessionId: string,
  taskId?: string
): Promise<GitCommitFailure[]> {
  const [sessionFailures, taskFailures] = await Promise.all([
    getGitCommitFailuresFromSessionLogs(clientState, sessionId),
    taskId ? getGitCommitFailuresFromTaskLogs(clientState, taskId) : Promise.resolve([])
  ]);

  // Combine and deduplicate by timestamp and submodule path
  const allFailures = [...sessionFailures, ...taskFailures];
  const uniqueFailures = allFailures.filter((failure, index, self) =>
    index === self.findIndex(f => 
      f.timestamp === failure.timestamp && 
      f.submodulePath === failure.submodulePath
    )
  );

  return uniqueFailures.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Format git commit failure for display
 */
export function formatGitCommitFailure(failure: GitCommitFailure): string {
  const date = new Date(failure.timestamp).toLocaleString('ja-JP');
  return `[${date}] Git commit failed in ${failure.submodulePath}
Message: ${failure.commitMessage}
Error: ${failure.errorOutput}
Working Directory: ${failure.workingDirectory}
${failure.gitStatus ? `Git Status: ${failure.gitStatus}` : ''}
${failure.gitLog ? `Recent Commits: ${failure.gitLog}` : ''}
${failure.environment ? `Environment: ${failure.environment.user}@${failure.environment.hostname}` : ''}`;
}

/**
 * Check if a task has git commit failures
 */
export async function hasGitCommitFailures(
  clientState: ClientState,
  taskId: string
): Promise<boolean> {
  try {
    const failures = await getGitCommitFailuresFromTaskLogs(clientState, taskId);
    return failures.length > 0;
  } catch {
    return false;
  }
}