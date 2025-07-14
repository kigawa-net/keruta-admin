/**
 * Backend Configuration Utility
 *
 * This file provides configuration for connecting to the backend API.
 * It uses environment variables to allow different configurations for
 * development, testing, and production environments.
 */

import jwt from 'jsonwebtoken';
import {defaultFetchOptions} from "~/utils/apiConfig";
import {LoadedClientState} from "~/components/Client";

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
 * Get the backend API URL from environment variables or use a default
 * Checks for API_URL first, then BACKEND_URL, then falls back to default
 * @returns The configured backend API URL
 */
export function getBackendUrl(): string {
    // Use API_URL or BACKEND_URL environment variable if available, otherwise use default
    return process.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8080';
}
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
