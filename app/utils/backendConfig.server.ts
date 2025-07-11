/**
 * Backend Configuration Utility
 *
 * This file provides configuration for connecting to the backend API.
 * It uses environment variables to allow different configurations for
 * development, testing, and production environments.
 */

import jwt from 'jsonwebtoken';

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
