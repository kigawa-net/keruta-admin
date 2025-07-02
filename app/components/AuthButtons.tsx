import React from 'react';
import { useAuth } from './KeycloakProvider';

/**
 * Authentication Buttons Component
 * 
 * This component displays login/logout buttons based on the current authentication state.
 */
export const AuthButtons: React.FC = () => {
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex align-items-center">
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div>
      {isAuthenticated ? (
        <button 
          className="btn btn-outline-danger" 
          onClick={() => logout()}
        >
          ログアウト
        </button>
      ) : (
        <button 
          className="btn btn-outline-primary" 
          onClick={() => login()}
        >
          ログイン
        </button>
      )}
    </div>
  );
};

export default AuthButtons;