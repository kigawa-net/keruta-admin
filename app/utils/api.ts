/**
 * API Utility
 *
 * This file provides utility functions for making API requests to the backend.
 * It uses the backend configuration from backendConfig.server.ts.
 */

import {LoadedClientState} from "~/components/Client";
import {createFetchOptions} from "~/utils/apiConfig";

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
export async function apiPost<T>(clientState: LoadedClientState, endpoint: string, data: any): Promise<T> {
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

    return response.json();
}

/**
 * Make a PUT request to the API
 * @param clientState
 * @param endpoint The API endpoint (without the base URL)
 * @param data The data to send in the request body
 * @returns The response data
 * @throws ApiError if the request fails
 */
export async function apiPut<T>(clientState: LoadedClientState, endpoint: string, data: any): Promise<T> {
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

    return response.json();
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
