import { AppEnvironment } from 'src/renderer/app/models/app-environment.model';

export const environment: AppEnvironment = {
  production: true,
  web: true,
  remoteConfig: 'prod',
  ci: false,
  websiteURL: '${WEB_URL}',
  apiURL: '${API_URL}'
};
