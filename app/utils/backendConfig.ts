/**
 * Backend Configuration Utility
 * 
 * This file provides configuration for connecting to the backend API.
 * It uses environment variables to allow different configurations for
 * development, testing, and production environments.
 */

import jwt from 'jsonwebtoken';

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
  return process.env.BACKEND_URL || 'http://localhost:3001';
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
  return `${getBackendUrl()}/api/${getApiVersion()}`;
}

/**
 * Generate a JWT token using the JWT_SECRET environment variable
 * @returns The generated JWT token or undefined if JWT_SECRET is not available
 */
export function generateJwtToken(): string | undefined {
  // Check if we're in a browser environment or if JWT_SECRET is not available
  if (typeof process === 'undefined' || !process.env || !process.env.JWT_SECRET) {
    return undefined;
  }

  // Generate a JWT token with some default claims
  const payload = {
    iss: 'keruta-admin',
    sub: 'api-access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
  };

  return jwt.sign(payload, process.env.JWT_SECRET);
}

/**
 * Get the authentication token for API requests if available
 * @returns The authentication token or undefined
 */
export function getAuthToken(): string | undefined {
  // Try to get token from Keycloak if we're in a browser environment
  if (typeof window !== 'undefined') {
    try {
      // Dynamically import to avoid server-side issues
      const { getKeycloakToken, isAuthenticated } = require('./keycloak');

      // If authenticated with Keycloak, use that token
      if (isAuthenticated()) {
        const keycloakToken = getKeycloakToken();
        if (keycloakToken) {
          return keycloakToken;
        }
      }
    } catch (error) {
      console.warn('Failed to get Keycloak token:', error);
    }
  }

  // Check if we're in a browser environment (process is not defined)
  if (typeof process === 'undefined' || !process.env) {
    // Use default for browser environment or return undefined
    return 'f89ed2ba-c7f2-4020-b9c0-114eb2255ef4';
  }

  // Try to generate a JWT token using JWT_SECRET
  const jwtToken = generateJwtToken();
  if (jwtToken) {
    return jwtToken;
  }

  // Fall back to AUTH_TOKEN from environment variables if available
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
