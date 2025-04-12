import { AppEnvironment } from 'src/renderer/app/models/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  web: false,
  remoteConfig: 'prod',
  ci: false,
  websiteURL: 'https://mockoon.com/',
  apiURL: 'https://api.mockoon.com/'
};
