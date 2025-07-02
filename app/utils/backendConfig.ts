/**
 * Backend Configuration Utility
 * 
 * This file provides configuration for connecting to the backend API.
 * It uses environment variables to allow different configurations for
 * development, testing, and production environments.
 */

/**
 * Get the backend API URL from environment variables or use a default
 * @returns The configured backend API URL
 */
export function getBackendUrl(): string {
  // Check if we're in a browser environment (process is not defined)
  if (typeof process === 'undefined' || !process.env) {
    // Use default for browser environment
    return 'https://keruta.kigawa.net';
  }
  // Use environment variable if available, otherwise use default
  return process.env.BACKEND_URL || 'http://localhost:3001/api';
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
 * Get the complete API URL including version
 * @returns The full API URL with version
 */
export function getApiUrl(): string {
  return `${getBackendUrl()}/${getApiVersion()}`;
}

/**
 * Get the authentication token for API requests if available
 * @returns The authentication token or undefined
 */
export function getAuthToken(): string | undefined {
  // Check if we're in a browser environment (process is not defined)
  if (typeof process === 'undefined' || !process.env) {
    // Use default for browser environment or return undefined
    return 'f89ed2ba-c7f2-4020-b9c0-114eb2255ef4';
  }
  return process.env.AUTH_TOKEN;
}

/**
 * Default fetch options for API requests
 */
export const defaultFetchOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Create fetch options with authentication if available
 * @param options Additional fetch options to include
 * @returns Fetch options with authentication headers if available
 */
export function createFetchOptions(options: RequestInit = {}): RequestInit {
  const authToken = getAuthToken();

  if (!authToken) {
    return { ...defaultFetchOptions, ...options };
  }

  return {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...options.headers,
      'Authorization': `Bearer ${authToken}`,
    },
  };
}
