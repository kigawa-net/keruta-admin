import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { initKeycloakAuth, login, logout, isAuthenticated } from '~/utils/keycloak';

// Define the authentication context type
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  error: Error | null;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  error: null,
});

// Hook to use the authentication context
export const useAuth = () => useContext(AuthContext);

// Props for the KeycloakProvider component
interface KeycloakProviderProps {
  children: React.ReactNode;
}

/**
 * Keycloak Authentication Provider Component
 * 
 * This component initializes Keycloak and provides authentication context to the application.
 */
export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
  }>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  
  const navigate = useNavigate();

  // Initialize Keycloak on component mount
  useEffect(() => {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const initAuth = async () => {
      try {
        await initKeycloakAuth(
          // Success callback
          () => {
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          },
          // Error callback
          (error) => {
            console.error('Failed to initialize Keycloak:', error);
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        );
      } catch (error) {
        console.error('Error initializing Keycloak:', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    };

    initAuth();
  }, []);

  // Check authentication status on route change
  useEffect(() => {
    if (!authState.isLoading) {
      const authenticated = isAuthenticated();
      if (authState.isAuthenticated !== authenticated) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: authenticated,
        }));
      }
    }
  }, [navigate, authState.isLoading]);

  // Provide the authentication context to children
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        login,
        logout,
        error: authState.error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default KeycloakProvider;