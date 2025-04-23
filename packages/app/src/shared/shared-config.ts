import { defaultMaxTransactionLogs } from '@mockoon/commons';

const appVersion: string = require('../../package.json').version;

/**
 * Share config between main and renderer processes
 * Shouldn't be imported directly, use each Config file instead
 *
 * @param options
 * @returns
 */
export const SharedConfig = (options: {
  websiteURL: string;
  apiURL: string;
  isWeb?: boolean;
}) => {
  const docsURL = `${options.websiteURL}docs/latest/`;

  return {
    isWeb: options.isWeb,
    appVersion,
    telemetry: {
      sessionDuration: 3_600_000 // 1h
    },
    websiteURL: options.websiteURL,
    apiURL: options.apiURL,
    githubBinaryURL: 'https://github.com/mockoon/mockoon/releases/download/',
    latestReleaseDataURL: `${options.apiURL}releases/desktop/stable.json`,
    changelogMarkdownURL: `${options.websiteURL}desktop-changelogs-markdown/`,
    releasePublicURL: `${options.websiteURL}releases/`,
    docs: {
      templating: docsURL + 'templating/overview/',
      proxy: docsURL + 'server-configuration/proxy-mode/',
      cors: docsURL + 'server-configuration/cors/',
      https: docsURL + 'server-configuration/serving-over-tls/',
      headers: docsURL + 'response-configuration/response-headers/',
      rules: docsURL + 'route-responses/multiple-responses/',
      hostname: docsURL + 'server-configuration/listening-hostname/',
      faq: options.websiteURL + 'faq/',
      cloudOverview: docsURL + 'mockoon-cloud/overview/',
      cloudSync:
        docsURL + 'mockoon-cloud/data-synchronization-team-collaboration/',
      cloudSyncOffline:
        docsURL +
        'mockoon-cloud/data-synchronization-team-collaboration/#offline-editing'
    },
    // URLs should not be used directly in desktop app (but there is a redirection for the web app in user service). Instead use the flow methods in the user service
    appAuthURL: `${options.websiteURL}app-auth/`,
    loginURL: `${options.websiteURL}login/`,
    accountUrl: `${options.websiteURL}account/subscription/`,
    cloudPlansURL: `${options.websiteURL}cloud/`,
    maxPromptLength: 500,
    defaultMaxLogsPerEnvironment: defaultMaxTransactionLogs,
    defaultMainMenuSize: 100,
    defaultSecondaryMenuSize: 200,
    storageSaveDelay: 1000, // ms
    fileReWatchDelay: 3000, // ms
    authProvider: 'supabase',
    supabaseConfig: {
      url: 'https://uvxumifocjshijbqfbuf.supabase.co',
      anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2eHVtaWZvY2pzaGlqYnFmYnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNTE0MTMsImV4cCI6MjA1OTkyNzQxM30.L80vddpXnbJYzU11FGUEGelWP_z9v4PZ9imfH1ea8Q4'
    }
    // keycloakConfig: {
    //   url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    //   realm: process.env.KEYCLOAK_REALM || 'master',
    //   clientId: process.env.KEYCLOAK_CLIENT_ID || 'mockoon'
    // }
  };
};
