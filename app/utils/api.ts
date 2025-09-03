/**
 * API Utility
 *
 * This file provides utility functions for making API requests to the backend.
 * It uses the backend configuration from backendConfig.server.ts.
 */

import {ClientState} from "~/components/Client";
import {createFetchOptions} from "~/utils/apiConfig";
import {CoderTemplate, Session, SessionFormData, Template, Workspace, CreateWorkspaceData, UpdateWorkspaceData, WorkspaceTemplate, Task, TaskLog, CreateTaskLogData, SessionLog, CreateSessionLogData} from "~/types";
import {LogDiff, LogQuery} from "~/utils/logDiff";

/**
 * Generic API error class
 */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * Make a GET request to the API
 * @param clientState
 * @param endpoint The API endpoint (without the base URL)
 * @returns The response data
 * @throws ApiError if the request fails
 */
export async function apiGet<T>(clientState: ClientState, endpoint: string): Promise<T> {
    // Type guard: throw error if loading state
    if (clientState.state === "loading") {
        throw new ApiError("Client is still loading", 503);
    }

    // Use the API URL from backendConfig
    const baseUrl = clientState.apiUrl;
    const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
    const response = await fetch(url, createFetchOptions(clientState));

    if (!response.ok) {
        throw new ApiError(`API request failed: ${response.statusText}`, response.status);
    }

    return response.json();
}

/**
 * Make a POST request to the API
 * @param clientState
 * @param endpoint The API endpoint (without the base URL)
 * @param data The data to send in the request body
 * @returns The response data
 * @throws ApiError if the request fails
 */
export async function apiPost<T, D = Record<string, unknown>>(clientState: ClientState, endpoint: string, data: D): Promise<T> {
    // Type guard: throw error if loading state
    if (clientState.state === "loading") {
        throw new ApiError("Client is still loading", 503);
    }
    // Use the API URL from backendConfig
    const baseUrl = clientState.apiUrl;
    const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
    const response = await fetch(url, {
        ...createFetchOptions(clientState),
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new ApiError(`API request failed: ${response.statusText}`, response.status);
    }

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    if (text && contentType && contentType.includes('application/json')) {
        return JSON.parse(text);
    }

    // Return undefined for empty responses (void endpoints)
    return undefined as T;
}

/**
 * Make a PUT request to the API
 * @param clientState
 * @param endpoint The API endpoint (without the base URL)
 * @param data The data to send in the request body
 * @returns The response data
 * @throws ApiError if the request fails
 */
export async function apiPut<T, D = Record<string, unknown>>(clientState: ClientState, endpoint: string, data: D): Promise<T> {
    // Type guard: throw error if loading state
    if (clientState.state === "loading") {
        throw new ApiError("Client is still loading", 503);
    }
    // Use the API URL from backendConfig
    const baseUrl = clientState.apiUrl;
    const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
    const response = await fetch(url, {
        ...createFetchOptions(clientState),
        method: 'PUT',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new ApiError(`API request failed: ${response.statusText}`, response.status);
    }

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    if (text && contentType && contentType.includes('application/json')) {
        return JSON.parse(text);
    }

    // Return undefined for empty responses (void endpoints)
    return undefined as T;
}

/**
 * Make a DELETE request to the API
 * @param clientState
 * @param endpoint The API endpoint (without the base URL)
 * @returns The response data
 * @throws ApiError if the request fails
 */
export async function apiDelete<T>(clientState: ClientState, endpoint: string): Promise<T | void> {
    // Type guard: throw error if loading state
    if (clientState.state === "loading") {
        throw new ApiError("Client is still loading", 503);
    }
    // Use the API URL from backendConfig
    const baseUrl = clientState.apiUrl;
    const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
    const response = await fetch(url, {
        ...createFetchOptions(clientState),
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new ApiError(`API request failed: ${response.statusText}`, response.status);
    }

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    // Return void for empty responses
    return;
}

// Session API Functions
export async function getSessions(clientState: ClientState): Promise<Session[]> {
    return apiGet<Session[]>(clientState, "sessions");
}

export async function getSession(clientState: ClientState, sessionId: string): Promise<Session> {
    return apiGet<Session>(clientState, `sessions/${sessionId}`);
}

export async function createSession(clientState: ClientState, session: SessionFormData): Promise<Session> {
    return apiPost<Session, SessionFormData>(clientState, "sessions", session);
}

export async function updateSession(clientState: ClientState, sessionId: string, session: SessionFormData): Promise<Session> {
    return apiPut<Session, SessionFormData>(clientState, `sessions/${sessionId}`, session);
}

export async function deleteSession(clientState: ClientState, sessionId: string): Promise<void> {
    return apiDelete(clientState, `sessions/${sessionId}`);
}

// Coder Template API Functions
export async function getCoderTemplates(clientState: ClientState): Promise<CoderTemplate[]> {
    return apiGet<CoderTemplate[]>(clientState, "coder/templates");
}

export async function getCoderTemplate(clientState: ClientState, templateId: string): Promise<CoderTemplate> {
    return apiGet<CoderTemplate>(clientState, `coder/templates/${templateId}`);
}

// Template content API Functions
export async function getTemplateContent(clientState: ClientState, templatePath: string): Promise<{content: string}> {
    return apiGet<{content: string}>(clientState, `templates/content?path=${encodeURIComponent(templatePath)}`);
}

export async function updateTemplateContent(clientState: ClientState, templatePath: string, content: string): Promise<{success: boolean}> {
    return apiPut<{success: boolean}, {content: string}>(clientState, `templates/content?path=${encodeURIComponent(templatePath)}`, {content});
}

// Templates API Functions
export async function getTemplates(clientState: ClientState): Promise<Template[]> {
    return apiGet<Template[]>(clientState, "templates");
}

export async function getTemplate(clientState: ClientState, templateId: string): Promise<Template> {
    return apiGet<Template>(clientState, `templates/${templateId}`);
}

// Session synchronization API Functions
export async function syncSessionStatus(clientState: ClientState, sessionId: string): Promise<Session> {
    return apiPost<Session>(clientState, `sessions/${sessionId}/sync-status`, {});
}

export async function monitorSessionWorkspaces(clientState: ClientState, sessionId: string): Promise<void> {
    return apiPost<void>(clientState, `sessions/${sessionId}/monitor-workspaces`, {});
}

// Workspace API Functions
export async function getWorkspaces(clientState: ClientState, sessionId?: string): Promise<Workspace[]> {
    const endpoint = sessionId ? `workspaces?sessionId=${sessionId}` : "workspaces";
    return apiGet<Workspace[]>(clientState, endpoint);
}

export async function getWorkspace(clientState: ClientState, workspaceId: string): Promise<Workspace> {
    return apiGet<Workspace>(clientState, `workspaces/${workspaceId}`);
}

export async function createWorkspace(clientState: ClientState, workspace: CreateWorkspaceData): Promise<Workspace> {
    return apiPost<Workspace, CreateWorkspaceData>(clientState, "workspaces", workspace);
}

export async function updateWorkspace(clientState: ClientState, workspaceId: string, workspace: UpdateWorkspaceData): Promise<Workspace> {
    return apiPut<Workspace, UpdateWorkspaceData>(clientState, `workspaces/${workspaceId}`, workspace);
}

export async function updateWorkspaceStatus(clientState: ClientState, workspaceId: string, status: string): Promise<Workspace> {
    return apiPut<Workspace, {status: string}>(clientState, `workspaces/${workspaceId}/status`, {status});
}

export async function startWorkspace(clientState: ClientState, workspaceId: string): Promise<Workspace> {
    return apiPost<Workspace>(clientState, `workspaces/${workspaceId}/start`, {});
}

export async function stopWorkspace(clientState: ClientState, workspaceId: string): Promise<Workspace> {
    return apiPost<Workspace>(clientState, `workspaces/${workspaceId}/stop`, {});
}

export async function deleteWorkspace(clientState: ClientState, workspaceId: string): Promise<void> {
    return apiDelete<void>(clientState, `workspaces/${workspaceId}`);
}

export async function getWorkspaceBySessionId(clientState: ClientState, sessionId: string): Promise<Workspace> {
    return apiGet<Workspace>(clientState, `workspaces/session/${sessionId}`);
}

export async function getWorkspaceTemplates(clientState: ClientState): Promise<WorkspaceTemplate[]> {
    return apiGet<WorkspaceTemplate[]>(clientState, "workspaces/templates");
}

// Task API Functions
export async function getTasks(clientState: ClientState): Promise<Task[]> {
    return apiGet<Task[]>(clientState, "tasks");
}

export async function getTask(clientState: ClientState, taskId: string): Promise<Task> {
    return apiGet<Task>(clientState, `tasks/${taskId}`);
}

export async function createTask(clientState: ClientState, taskData: {sessionId: string, name: string, description?: string, script?: string}): Promise<Task> {
    return apiPost<Task, {sessionId: string, name: string, description?: string, script?: string}>(clientState, "tasks", taskData);
}

export async function updateTask(clientState: ClientState, taskId: string, taskData: Partial<Task>): Promise<Task> {
    return apiPut<Task, Partial<Task>>(clientState, `tasks/${taskId}`, taskData);
}

export async function deleteTask(clientState: ClientState, taskId: string): Promise<void> {
    return apiDelete(clientState, `tasks/${taskId}`);
}

export async function pauseTask(clientState: ClientState, taskId: string): Promise<Task> {
    return apiPost<Task>(clientState, `tasks/${taskId}/pause`, {});
}

export async function resumeTask(clientState: ClientState, taskId: string): Promise<Task> {
    return apiPost<Task>(clientState, `tasks/${taskId}/resume`, {});
}

// Task Log API Functions
export async function getTaskLogs(
    clientState: ClientState, 
    taskId: string,
    filters?: {
        level?: string;
        startTime?: string;
        endTime?: string;
    }
): Promise<TaskLog[]> {
    let endpoint = `tasks/${taskId}/logs`;
    const params = new URLSearchParams();
    
    if (filters?.level) {
        params.append('level', filters.level);
    }
    if (filters?.startTime) {
        params.append('startTime', filters.startTime);
    }
    if (filters?.endTime) {
        params.append('endTime', filters.endTime);
    }
    
    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }
    
    return apiGet<TaskLog[]>(clientState, endpoint);
}

export async function createTaskLog(clientState: ClientState, taskId: string, logData: CreateTaskLogData): Promise<TaskLog> {
    return apiPost<TaskLog, CreateTaskLogData>(clientState, `tasks/${taskId}/logs`, logData);
}

export async function getTaskLogCount(clientState: ClientState, taskId: string): Promise<{ count: number }> {
    return apiGet<{ count: number }>(clientState, `tasks/${taskId}/logs/count`);
}

export async function deleteTaskLogs(clientState: ClientState, taskId: string): Promise<void> {
    return apiDelete(clientState, `tasks/${taskId}/logs`);
}

// Session Log API Functions
export async function getSessionLogs(
    clientState: ClientState, 
    sessionId: string,
    filters?: {
        level?: string;
        source?: string;
        action?: string;
        startTime?: string;
        endTime?: string;
        limit?: number;
        offset?: number;
    }
): Promise<SessionLog[]> {
    let endpoint = `sessions/${sessionId}/logs`;
    const params = new URLSearchParams();
    
    if (filters?.level) {
        params.append('level', filters.level);
    }
    if (filters?.source) {
        params.append('source', filters.source);
    }
    if (filters?.action) {
        params.append('action', filters.action);
    }
    if (filters?.startTime) {
        params.append('startTime', filters.startTime);
    }
    if (filters?.endTime) {
        params.append('endTime', filters.endTime);
    }
    if (filters?.limit) {
        params.append('limit', filters.limit.toString());
    }
    if (filters?.offset) {
        params.append('offset', filters.offset.toString());
    }
    
    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }
    
    return apiGet<SessionLog[]>(clientState, endpoint);
}

export async function getSessionLog(clientState: ClientState, sessionId: string, logId: string): Promise<SessionLog> {
    return apiGet<SessionLog>(clientState, `sessions/${sessionId}/logs/${logId}`);
}

export async function createSessionLog(clientState: ClientState, sessionId: string, logData: CreateSessionLogData): Promise<SessionLog> {
    return apiPost<SessionLog, CreateSessionLogData>(clientState, `sessions/${sessionId}/logs`, logData);
}

export async function getSessionLogCount(
    clientState: ClientState, 
    sessionId: string,
    filters?: {
        level?: string;
        source?: string;
        action?: string;
        startTime?: string;
        endTime?: string;
    }
): Promise<{ count: number }> {
    let endpoint = `sessions/${sessionId}/logs/count`;
    const params = new URLSearchParams();
    
    if (filters?.level) {
        params.append('level', filters.level);
    }
    if (filters?.source) {
        params.append('source', filters.source);
    }
    if (filters?.action) {
        params.append('action', filters.action);
    }
    if (filters?.startTime) {
        params.append('startTime', filters.startTime);
    }
    if (filters?.endTime) {
        params.append('endTime', filters.endTime);
    }
    
    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }
    
    return apiGet<{ count: number }>(clientState, endpoint);
}

export async function deleteSessionLogs(clientState: ClientState, sessionId: string): Promise<void> {
    return apiDelete(clientState, `sessions/${sessionId}/logs`);
}

export async function getRecentSessionLogs(clientState: ClientState, limit: number = 100): Promise<SessionLog[]> {
    return apiGet<SessionLog[]>(clientState, `sessions/logs/recent?limit=${limit}`);
}

export async function getSessionLogsByLevel(clientState: ClientState, level: string, limit: number = 100): Promise<SessionLog[]> {
    return apiGet<SessionLog[]>(clientState, `sessions/logs/level/${level}?limit=${limit}`);
}

// Log Diff API Functions
export async function getTaskLogsDiff(
    clientState: ClientState,
    taskId: string,
    query: LogQuery
): Promise<LogDiff> {
    const params = new URLSearchParams();
    
    if (query.since) {
        params.append('since', query.since);
    }
    if (query.version) {
        params.append('version', query.version.toString());
    }
    if (query.limit) {
        params.append('limit', query.limit.toString());
    }
    if (query.level) {
        params.append('level', query.level);
    }
    if (query.source) {
        params.append('source', query.source);
    }
    
    const endpoint = `tasks/${taskId}/logs/diff?${params.toString()}`;
    return apiGet<LogDiff>(clientState, endpoint);
}

export async function getSessionLogsDiff(
    clientState: ClientState,
    sessionId: string,
    query: LogQuery
): Promise<LogDiff> {
    const params = new URLSearchParams();
    
    if (query.since) {
        params.append('since', query.since);
    }
    if (query.version) {
        params.append('version', query.version.toString());
    }
    if (query.limit) {
        params.append('limit', query.limit.toString());
    }
    if (query.level) {
        params.append('level', query.level);
    }
    if (query.source) {
        params.append('source', query.source);
    }
    
    const endpoint = `sessions/${sessionId}/logs/diff?${params.toString()}`;
    return apiGet<LogDiff>(clientState, endpoint);
}

export async function getAllLogsDiff(
    clientState: ClientState,
    query: LogQuery
): Promise<LogDiff> {
    const params = new URLSearchParams();
    
    if (query.since) {
        params.append('since', query.since);
    }
    if (query.version) {
        params.append('version', query.version.toString());
    }
    if (query.limit) {
        params.append('limit', query.limit.toString());
    }
    if (query.level) {
        params.append('level', query.level);
    }
    if (query.source) {
        params.append('source', query.source);
    }
    
    const endpoint = `logs/diff?${params.toString()}`;
    return apiGet<LogDiff>(clientState, endpoint);
}
