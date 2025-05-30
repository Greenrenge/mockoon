// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

import { AppEnvironment } from 'src/renderer/app/models/app-environment.model';

export const environment: AppEnvironment = {
  production: false,
  web: false,
  remoteConfig: 'dev',
  ci: false,
  websiteURL: 'http://localhost:3000/',
  apiURL: 'http://localhost:5003/api/'
};
