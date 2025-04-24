import { AppEnvironment } from 'src/renderer/app/models/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  web: false,
  remoteConfig: 'prod',
  ci: false,
  websiteURL: 'https://any.com/',
  apiURL: 'https://api.any.com/'
};
