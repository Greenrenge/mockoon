/**
 * Environment configuration for the application
 * Uses environment variables with fallbacks to sensible defaults
 */

// Helper to safely access browser environment
const isBrowser = typeof window !== 'undefined';

// Environment-specific configuration
interface EnvConfig {
  // Base URL for the website (e.g., https://example.com)
  WEBSITE_URL: string;

  // Base URL for the API (e.g., https://api.example.com)
  API_URL: string;

  // URL for web config endpoint
  WEB_CONFIG_URL: string;

  // Auth silent check SSO URL
  AUTH_SILENT_CHECK_URL: string;
}

// Default values based on the current origin in browser or hardcoded defaults for SSR
const getDefaultOrigin = (): string => {
  if (isBrowser) {
    return window.location.origin;
  }
  return 'http://localhost:3000'; // Default for SSR context
};

// Initialize environment configuration
export const env: EnvConfig = {
  WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL || getDefaultOrigin(),

  API_URL: `${process.env.NEXT_PUBLIC_WEB_FULL_URL || getDefaultOrigin()}`,

  WEB_CONFIG_URL: `${
    process.env.NEXT_PUBLIC_WEB_FULL_URL || getDefaultOrigin()
  }/public/web-config`,

  AUTH_SILENT_CHECK_URL: `${getDefaultOrigin()}/auth/silent-check-sso.html`
};

// Declare global window interface for runtime environment variables
declare global {
  interface Window {
    __ENV__?: {
      WEBSITE_URL?: string;
      WEB_FULL_URL?: string; // to api-server
    };
  }
}
