declare module 'keycloak-js' {
  export default class Keycloak {
    constructor(config: KeycloakConfig);

    authenticated?: boolean;
    token?: string;

    init(options: KeycloakInitOptions): Promise<boolean>;
    updateToken(minValidity: number): Promise<boolean>;
    login(options?: KeycloakLoginOptions): void;
    logout(options?: KeycloakLogoutOptions): void;
  }

  export interface KeycloakConfig {
    url: string;
    realm: string;
    clientId: string;
  }

  export interface KeycloakInitOptions {
    onLoad?: 'login-required' | 'check-sso';
    silentCheckSsoRedirectUri?: string;
    pkceMethod?: 'S256';
  }

  export interface KeycloakLoginOptions {
    redirectUri?: string;
  }

  export interface KeycloakLogoutOptions {
    redirectUri?: string;
  }
}
