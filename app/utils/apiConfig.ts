import {LoadedClientState} from "~/components/Client";

/**
 * Default fetch options for API requests
 */
export const defaultFetchOptions: RequestInit = {
    headers: {
        'Content-Type': 'application/json',
    },
};


/**
 * Get the complete API URL including version
 * Handles cases where API_URL might already include part of the path
 * @returns The full API URL with version
 */
export function getApiUrl(): string {
    const baseUrl = getBackendUrl();

    // Check if the URL already contains /api/ to avoid duplication
    if (baseUrl.includes('/api/')) {
        return baseUrl;
    }

    return `${baseUrl}/api/${getApiVersion()}`;
}

/**
 * Get the backend API URL from environment variables or use a default
 * Checks for API_URL first, then BACKEND_URL, then falls back to default
 * @returns The configured backend API URL
 */
export function getBackendUrl(): string {
    // Check if we're in a browser environment (process is not defined)
    if (typeof process === 'undefined' || !process.env) {
        // Use default for browser environment
        return 'https://keruta.kigawa.net';
    }
    // Use API_URL or BACKEND_URL environment variable if available, otherwise use default
    return process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
}

/**
 * Get the backend API version from environment variables or use a default
 * @returns The configured API version
 */
export function getApiVersion(): string {
    // Check if we're in a browser environment (process is not defined)
    if (typeof process === 'undefined' || !process.env) {
        // Use default for browser environment
        return 'v1';
    }
    return process.env.API_VERSION || 'v1';
}

/**
 * Create fetch options with authentication if available
 * @param client
 * @param options Additional fetch options to include
 * @returns Fetch options with authentication headers if available
 */
export function createFetchOptions(client: LoadedClientState, options: RequestInit = {}): RequestInit {

    if (client.state == "unauthorized") {
        return {...defaultFetchOptions, ...options};
    }

    return {
        ...defaultFetchOptions,
        ...options,
        headers: {
            ...defaultFetchOptions.headers,
            ...options.headers,
            'Authorization': `Bearer ${client.authToken}`,
        },
    };
}
