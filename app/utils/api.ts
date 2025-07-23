/**
 * API Utility
 *
 * This file provides utility functions for making API requests to the backend.
 * It uses the backend configuration from backendConfig.server.ts.
 */

import {LoadedClientState} from "~/components/Client";
import {createFetchOptions} from "~/utils/apiConfig";
import {CoderTemplate, Session, SessionFormData} from "~/types";

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
export async function apiGet<T>(clientState: LoadedClientState
    , endpoint: string): Promise<T> {
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
export async function apiPost<T, D = Record<string, unknown>>(clientState: LoadedClientState, endpoint: string, data: D): Promise<T> {
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
export async function apiPut<T, D = Record<string, unknown>>(clientState: LoadedClientState, endpoint: string, data: D): Promise<T> {
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
export async function apiDelete<T>(clientState: LoadedClientState, endpoint: string): Promise<T | void> {
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
export async function getSessions(clientState: LoadedClientState): Promise<Session[]> {
    return apiGet<Session[]>(clientState, "sessions");
}

export async function getSession(clientState: LoadedClientState, sessionId: string): Promise<Session> {
    return apiGet<Session>(clientState, `sessions/${sessionId}`);
}

export async function createSession(clientState: LoadedClientState, session: SessionFormData): Promise<Session> {
    return apiPost<Session, SessionFormData>(clientState, "sessions", session);
}

export async function updateSession(clientState: LoadedClientState, sessionId: string, session: SessionFormData): Promise<Session> {
    return apiPut<Session, SessionFormData>(clientState, `sessions/${sessionId}`, session);
}

export async function deleteSession(clientState: LoadedClientState, sessionId: string): Promise<void> {
    return apiDelete(clientState, `sessions/${sessionId}`);
}

// Coder Template API Functions
export async function getCoderTemplates(clientState: LoadedClientState): Promise<CoderTemplate[]> {
    return apiGet<CoderTemplate[]>(clientState, "coder/templates");
}

export async function getCoderTemplate(clientState: LoadedClientState, templateId: string): Promise<CoderTemplate> {
    return apiGet<CoderTemplate>(clientState, `coder/templates/${templateId}`);
}

// Template content API Functions
export async function getTemplateContent(clientState: LoadedClientState, templatePath: string): Promise<{content: string}> {
    return apiGet<{content: string}>(clientState, `templates/content?path=${encodeURIComponent(templatePath)}`);
}

export async function updateTemplateContent(clientState: LoadedClientState, templatePath: string, content: string): Promise<{success: boolean}> {
    return apiPut<{success: boolean}, {content: string}>(clientState, `templates/content?path=${encodeURIComponent(templatePath)}`, {content});
}

// Session synchronization API Functions
export async function syncSessionStatus(clientState: LoadedClientState, sessionId: string): Promise<Session> {
    return apiPost<Session>(clientState, `sessions/${sessionId}/sync-status`, {});
}

export async function monitorSessionWorkspaces(clientState: LoadedClientState, sessionId: string): Promise<void> {
    return apiPost<void>(clientState, `sessions/${sessionId}/monitor-workspaces`, {});
}
