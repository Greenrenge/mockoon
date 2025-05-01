'use client';

import type React from 'react';

import { createContext, useContext, useEffect, useState } from 'react';
import { env } from '../../config/env';
console.log('env', env);

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
  getAuthToken: () => Promise<string | null>;
};

// Define the interface for auth providers
interface LoginAuthProvider {
  initialize(): Promise<void>;
  isAuthenticated(): boolean;
  getUser(): any | null;
  getAuthToken(): Promise<string | null>;
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

  async getAuthToken(): Promise<string | null> {
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
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: env.AUTH_SILENT_CHECK_URL,
        pkceMethod: 'S256'
      });

      this.authenticated = authenticated;

      if (authenticated) {
        this.user = {
          id: this.keycloak.subject,
          name: this.keycloak.tokenParsed.name,
          email: this.keycloak.tokenParsed.email,
          roles: this.keycloak.tokenParsed.realm_access?.roles || []
        };
      }

      // Set up token refresh
      this.keycloak.onTokenExpired = () => {
        this.keycloak.updateToken(30);
      };
    } catch (error) {
      console.error('Failed to initialize Keycloak:', error);
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
    }
  }

  async logout(): Promise<void> {
    if (this.keycloak) {
      await this.keycloak.logout();
      this.authenticated = false;
      this.user = null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    if (!this.keycloak || !this.authenticated) {
      return null;
    }

    // Update the token if it's expired or about to expire
    try {
      const updated = await this.keycloak.updateToken(30);
      if (updated) {
        console.log('Token was successfully refreshed');
      }
      return this.keycloak.token;
    } catch (error) {
      console.error(
        'Failed to refresh the token, or the session has expired',
        error
      );
      return null;
    }
  }
}

// Implementation for Supabase auth provider
class SupabaseAuthProvider implements LoginAuthProvider {
  private authenticated = false;
  private user: any = null;
  private supabase: any = null;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
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
        } else {
          this.user = null;
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
    }
  }

  async logout(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut();
      this.authenticated = false;
      this.user = null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    if (!this.supabase || !this.authenticated) {
      return null;
    }

    try {
      const { data } = await this.supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch (error) {
      console.error('Failed to get auth token from Supabase:', error);
      return null;
    }
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
  getAuthToken: async () => null
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

  const getAuthToken = async (): Promise<string | null> => {
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
