'use client';

import type React from 'react';

import { createContext, useContext, useEffect, useState } from 'react';
import { env } from '../../config/env';

// Auth config type definition
type AuthConfig = {
  websiteURL?: string;
  apiURL?: string;
  authProvider?: 'disabled' | 'keycloak' | 'supabase';
  option: {
    url?: string;
    realm?: string;
    clientId?: string;
    anonKey?: string;
  };
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  config: AuthConfig;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAuthToken: () => string | null;
};

// Define the interface for auth providers
interface LoginAuthProvider {
  initialize(): Promise<void>;
  isAuthenticated(): boolean;
  getUser(): any | null;
  getAuthToken(): string | null;
  login(): Promise<void>;
  logout(): Promise<void>;
}

// Implementation for disabled auth provider (always authenticated)
class DisabledAuthProvider implements LoginAuthProvider {
  private authenticated = true;
  private user = {
    id: 'mock-user',
    name: 'Mock User',
    email: 'mock@example.com',
    roles: ['user']
  };

  async initialize(): Promise<void> {
    // No initialization needed for disabled auth
    return Promise.resolve();
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUser(): any {
    return this.user;
  }

  getAuthToken(): string | null {
    return 'mock-token-for-disabled-auth';
  }

  async login(): Promise<void> {
    this.authenticated = true;
    return Promise.resolve();
  }

  async logout(): Promise<void> {
    // In disabled mode, we don't actually log out
    return Promise.resolve();
  }
}

// Implementation for Keycloak auth provider
class KeycloakAuthProvider implements LoginAuthProvider {
  private authenticated = false;
  private user: any = null;
  private keycloak: any = null;
  private config: AuthConfig;
  private accessToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly BUFFER_TIME = 30; // Buffer time in seconds before token expires

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Import Keycloak dynamically
      const Keycloak = (await import('keycloak-js')).default;

      this.keycloak = new Keycloak({
        url: this.config.option.url!,
        realm: this.config.option.realm!,
        clientId: this.config.option.clientId!
      });

      const authenticated = await this.keycloak.init({
        // onLoad: 'check-sso',
        onLoad: 'login-required',
        // https://github.com/keycloak/keycloak/issues/36063 , only works on https
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: env.AUTH_SILENT_CHECK_URL
        // pkceMethod: 'S256'
      });

      this.authenticated = authenticated;

      if (authenticated) {
        this.user = {
          id: this.keycloak.subject,
          name: this.keycloak.tokenParsed.name,
          email: this.keycloak.tokenParsed.email,
          roles: this.keycloak.tokenParsed.realm_access?.roles || []
        };

        // Initialize access token
        this.accessToken = this.keycloak.token;

        // Set up periodic token refresh
        this.startTokenRefreshTimer();
      }

      // Set up token refresh on expiration event
      this.keycloak.onTokenExpired = () => {
        this.refreshToken();
      };
    } catch (error) {
      console.error('Failed to initialize Keycloak:', error);
      this.authenticated = false;
    }
  }

  // Start the token refresh timer
  private startTokenRefreshTimer(): void {
    // Clear any existing timer first
    this.clearTokenRefreshTimer();

    if (this.keycloak && this.keycloak.tokenParsed) {
      // Get token expiration time from the token
      const expiresAt = this.keycloak.tokenParsed.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      // Calculate time until expiration minus buffer time
      const timeToExpiry = expiresAt - now - this.BUFFER_TIME * 1000;

      if (timeToExpiry > 0) {
        console.log(
          `Token will refresh in ${Math.floor(timeToExpiry / 1000)} seconds (before expiry)`
        );

        // Schedule refresh right before token expires
        this.refreshTimer = setTimeout(() => {
          this.refreshToken();
        }, timeToExpiry);

        return;
      }
    }

    // Fallback to fixed interval if we can't determine expiration time
    console.log(
      `Using fallback refresh interval of ${this.REFRESH_INTERVAL / 1000} seconds`
    );
    this.refreshTimer = setInterval(() => {
      this.refreshToken();
    }, this.REFRESH_INTERVAL);
  }

  // Clear the token refresh timer
  private clearTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUser(): any {
    return this.user;
  }

  async login(): Promise<void> {
    if (!this.keycloak) {
      await this.initialize();
    }

    if (this.keycloak) {
      await this.keycloak.login();
      this.authenticated = true;

      this.user = {
        id: this.keycloak.subject,
        name: this.keycloak.tokenParsed.name,
        email: this.keycloak.tokenParsed.email,
        roles: this.keycloak.tokenParsed.realm_access?.roles || []
      };

      // Update access token
      this.accessToken = this.keycloak.token;

      // Set up periodic token refresh
      this.startTokenRefreshTimer();
    }
  }

  async logout(): Promise<void> {
    // Clear token refresh timer
    this.clearTokenRefreshTimer();

    if (this.keycloak) {
      await this.keycloak.logout();
      this.authenticated = false;
      this.user = null;
      this.accessToken = null;
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.keycloak) {
      await this.initialize();
    }
    if (this.keycloak) {
      try {
        const refreshed = await this.keycloak.updateToken(30);
        if (refreshed) {
          this.accessToken = this.keycloak.token;
          console.log('Token refreshed successfully');

          // After successful refresh, update the timer based on the new token's expiry
          this.startTokenRefreshTimer();
        } else {
          console.log('Token is still valid, no refresh needed');
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Fallback to fixed interval refresh on error
        this.clearTokenRefreshTimer();
        this.refreshTimer = setTimeout(() => {
          this.refreshToken();
        }, 60000); // Try again in 1 minute on error
      }
    }
  }

  getAuthToken(): string | null {
    return this.accessToken;
  }
}

// Implementation for Supabase auth provider
class SupabaseAuthProvider implements LoginAuthProvider {
  private authenticated = false;
  private user: any = null;
  private supabase: any = null;
  private config: AuthConfig;
  private accessToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(config: AuthConfig) {
    this.config = config;
  }

  // Start the token refresh timer
  private startTokenRefreshTimer(): void {
    // Clear any existing timer first
    this.clearTokenRefreshTimer();

    this.refreshTimer = setInterval(async () => {
      await this.refreshToken();
    }, this.REFRESH_INTERVAL);
  }

  // Clear the token refresh timer
  private clearTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Method to refresh the token
  private async refreshToken(): Promise<void> {
    if (!this.supabase || !this.authenticated) {
      return;
    }

    try {
      const { data } = await this.supabase.auth.getSession();
      this.accessToken = data.session?.access_token || null;
      console.log('Supabase token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh token from Supabase:', error);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Import Supabase dynamically
      const { createClient } = await import('@supabase/supabase-js');

      const supabaseUrl = this.config.option.url || '';
      const supabaseAnonKey = this.config.option.anonKey || '';

      this.supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Get current session
      const {
        data: { session }
      } = await this.supabase.auth.getSession();

      if (session) {
        this.authenticated = true;
        const {
          data: { user }
        } = await this.supabase.auth.getUser();

        if (user) {
          this.user = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email,
            roles: user.app_metadata?.roles || ['user']
          };

          // Initialize access token
          this.accessToken = session.access_token || null;

          // Start token refresh timer
          this.startTokenRefreshTimer();
        }
      }

      // Set up auth state change listener
      this.supabase.auth.onAuthStateChange((_event: string, session: any) => {
        this.authenticated = !!session;
        if (session?.user) {
          const user = session.user;
          this.user = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email,
            roles: user.app_metadata?.roles || ['user']
          };

          // Update access token on auth state change
          this.accessToken = session.access_token || null;

          // Reset timer when auth state changes
          if (this.authenticated) {
            this.startTokenRefreshTimer();
          } else {
            this.clearTokenRefreshTimer();
          }
        } else {
          this.user = null;
          this.accessToken = null;
          this.clearTokenRefreshTimer();
        }
      });
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.authenticated = false;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUser(): any {
    return this.user;
  }

  async login(): Promise<void> {
    if (!this.supabase) {
      await this.initialize();
    }

    if (this.supabase) {
      const email = prompt('Please enter your email to login');
      if (!email) return;
      await this.supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {}
      });

      // Note: The token will be set via the onAuthStateChange event
      // and the timer will be started there as well
    }
  }

  async logout(): Promise<void> {
    // Clear token refresh timer
    this.clearTokenRefreshTimer();

    if (this.supabase) {
      await this.supabase.auth.signOut();
      this.authenticated = false;
      this.user = null;
      this.accessToken = null;
    }
  }

  getAuthToken(): string | null {
    return this.accessToken;
  }
}

// Factory class to create appropriate auth provider
class LoginAuthProviderFactory {
  static createAuthProvider(config: AuthConfig): LoginAuthProvider {
    switch (config.authProvider) {
      case 'keycloak':
        return new KeycloakAuthProvider(config);
      case 'supabase':
        return new SupabaseAuthProvider(config);
      case 'disabled':
      default:
        return new DisabledAuthProvider();
    }
  }
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  config: {
    authProvider: 'disabled',
    option: {}
  },
  login: async () => {},
  logout: async () => {},
  getAuthToken: () => null
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<AuthConfig>({
    authProvider: 'disabled',
    option: {}
  });
  const [authProvider, setAuthProvider] = useState<LoginAuthProvider | null>(
    null
  );

  useEffect(() => {
    // Fetch auth configuration
    const fetchConfig = async () => {
      try {
        // Use environment variable instead of hardcoded URL
        const response = await fetch(env.WEB_CONFIG_URL);
        const data = (await response.json()) as AuthConfig;
        const newConfig = {
          authProvider: data.authProvider,
          option: {
            url: data.option?.url,
            realm: data.option?.realm,
            clientId: data.option?.clientId,
            anonKey: data.option?.anonKey
          }
        };
        setConfig(newConfig);

        // Create and initialize the appropriate auth provider
        const provider = LoginAuthProviderFactory.createAuthProvider(newConfig);
        setAuthProvider(provider);

        await provider.initialize();
        setIsAuthenticated(provider.isAuthenticated());
        setUser(provider.getUser());
        setIsLoading(false);
      } catch (error) {
        console.error('Error setting up authentication:', error);
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const login = async () => {
    if (!authProvider) return;

    setIsLoading(true);
    try {
      await authProvider.login();
      setIsAuthenticated(authProvider.isAuthenticated());
      setUser(authProvider.getUser());
    } catch (error) {
      console.error('Error logging in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!authProvider) return;

    setIsLoading(true);
    try {
      await authProvider.logout();
      setIsAuthenticated(authProvider.isAuthenticated());
      setUser(authProvider.getUser());
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthToken = (): string | null => {
    if (!authProvider) return null;
    return authProvider.getAuthToken();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        config,
        login,
        logout,
        getAuthToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
