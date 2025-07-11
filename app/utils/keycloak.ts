import * as Keycloak from 'keycloak-js';

/**
 * Keycloak Configuration
 *
 * This file provides configuration and utility functions for Keycloak authentication.
 */

// Initialize Keycloak instance
let keycloak: Keycloak.default | null = null;

/**
 * Initialize the Keycloak instance
 * @returns The initialized Keycloak instance
 */
export function initKeycloak(): Keycloak.default {
  if (keycloak) {
    return keycloak;
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    throw new Error('Keycloak can only be initialized in a browser environment');
  }

  // Get Keycloak configuration from environment variables
  const url = process.env.KEYCLOAK_URL || 'https://keycloak.kigawa.net/auth';
  const realm = process.env.KEYCLOAK_REALM || 'keruta';
  const clientId = process.env.KEYCLOAK_CLIENT_ID || 'keruta-admin';

  // Create Keycloak instance
  keycloak = new Keycloak.default({
    url,
    realm,
    clientId,
  });

  return keycloak;
}

/**
 * Get the Keycloak instance
 * @returns The Keycloak instance or null if not initialized
 */
export function getKeycloak(): Keycloak.default | null {
  return keycloak;
}

/**
 * Check if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  return !!keycloak?.authenticated;
}

/**
 * Get the authentication token from Keycloak
 * @returns The authentication token or undefined if not authenticated
 */
export function getKeycloakToken(): string | undefined {
  return keycloak?.token;
}

/**
 * Initialize Keycloak and handle authentication
 * @param onSuccess Callback function to call when authentication is successful
 * @param onError Callback function to call when authentication fails
 */
export async function initKeycloakAuth(
  onSuccess: () => void,
  onError: (error: any) => void
): Promise<void> {
  try {
    const kc = initKeycloak();

    // Initialize Keycloak
    const authenticated = await kc.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
    });

    if (authenticated) {
      // Setup token refresh
      setupTokenRefresh(kc);
      onSuccess();
    } else {
      console.log('Not authenticated');
    }
  } catch (error) {
    onError(error);
  }
}

/**
 * Setup token refresh
 * @param kc The Keycloak instance
 */
function setupTokenRefresh(kc: Keycloak.default): void {
  // Setup token refresh
  setInterval(() => {
    kc.updateToken(70)
      .then((refreshed) => {
        if (refreshed) {
          console.log('Token refreshed');
        }
      })
      .catch(() => {
        console.error('Failed to refresh token');
        // Force re-login on token refresh failure
        kc.login();
      });
  }, 60000); // Check token every minute
}

/**
 * Login with Keycloak
 */
export function login(): void {
  keycloak?.login();
}

/**
 * Logout from Keycloak
 */
export function logout(): void {
  keycloak?.logout();
}
