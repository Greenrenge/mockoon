import {
  enableProdMode,
  ErrorHandler,
  importProvidersFrom,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  SecurityContext
} from '@angular/core';
import { MainAPIModel } from 'src/renderer/app/models/main-api.model';

import { DatePipe } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  NgbConfig,
  NgbDropdownConfig,
  NgbModalConfig,
  NgbModule,
  NgbTooltipConfig,
  NgbTypeaheadConfig
} from '@ng-bootstrap/ng-bootstrap';
import {
  AutoRefreshTokenService,
  createKeycloakSignal,
  KEYCLOAK_EVENT_SIGNAL,
  UserActivityService
} from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { MarkdownModule, MARKED_OPTIONS } from 'ngx-markdown';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { AppComponent } from 'src/renderer/app/app.component';
import { MarkedOptionsFactory } from 'src/renderer/app/modules-config/markdown.config';
import { NgbDropdownConfigFactory } from 'src/renderer/app/modules-config/ngb-dropdown.config';
import { NgbModalConfigFactory } from 'src/renderer/app/modules-config/ngb-modal.config';
import { NgbTooltipConfigFactory } from 'src/renderer/app/modules-config/ngb-tooltip.config';
import { NgbTypeaheadConfigFactory } from 'src/renderer/app/modules-config/ngb-typeahead.config';
import { NgbConfigFactory } from 'src/renderer/app/modules-config/ngb.config';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { GlobalErrorHandler } from 'src/renderer/app/services/global-error-handler';
import { MainApiService } from 'src/renderer/app/services/main-api.service';
import { environment } from 'src/renderer/environments/environment';
import { USER_SERVICE_TOKEN } from './app/interfaces/user-service.interface';
import { UserServiceFactory } from './app/services/user-service.factory';
declare global {
  interface Window {
    api: MainAPIModel;
  }
}

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAppInitializer(async () => {
      const appConfigService = inject(AppConfigService);
      await appConfigService.load();
    }),
    makeEnvironmentProviders([
      AutoRefreshTokenService,
      UserActivityService,
      {
        provide: KEYCLOAK_EVENT_SIGNAL,
        useFactory: (appConfigService: AppConfigService, keycloak) => {
          const cfg = appConfigService.getConfig();
          if (cfg.authProvider === 'keycloak') {
            return createKeycloakSignal(keycloak);
          }

          return null;
        },
        deps: [AppConfigService, Keycloak]
      },
      {
        provide: Keycloak,
        useFactory: (appConfigService: AppConfigService) => {
          const cfg = appConfigService.getConfig();
          if (cfg.authProvider === 'keycloak') {
            const keycloak = new Keycloak({
              url: cfg.option.url,
              realm: cfg.option.realm,
              clientId: cfg.option.clientId
            });
            keycloak
              .init({
                onLoad: 'login-required',
                // https://github.com/keycloak/keycloak/issues/36063 , only works on https
                checkLoginIframe: false,
                silentCheckSsoRedirectUri:
                  window.location.origin + '/silent-check-sso.html'
              })
              .catch((error) =>
                // eslint-disable-next-line no-console
                console.error('Keycloak initialization failed', error)
              );

            return keycloak;
          }

          return null;
        },
        deps: [AppConfigService]
      }
    ]),
    importProvidersFrom(
      BrowserModule,
      FormsModule,
      NgbModule,
      MarkdownModule.forRoot({
        sanitize: SecurityContext.NONE,
        markedOptions: {
          provide: MARKED_OPTIONS,
          useFactory: MarkedOptionsFactory
        }
      }),
      ReactiveFormsModule.withConfig({
        callSetDisabledState: 'whenDisabledForLegacyCode'
      }),
      NgxMaskDirective
    ),
    DatePipe,
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    {
      provide: NgbConfig,
      useFactory: NgbConfigFactory
    },
    {
      provide: NgbTypeaheadConfig,
      useFactory: NgbTypeaheadConfigFactory
    },
    {
      provide: NgbTooltipConfig,
      useFactory: NgbTooltipConfigFactory
    },
    {
      provide: NgbDropdownConfig,
      useFactory: NgbDropdownConfigFactory
    },
    {
      provide: NgbModalConfig,
      useFactory: NgbModalConfigFactory
    },
    {
      provide: USER_SERVICE_TOKEN,
      useFactory: (
        factory: UserServiceFactory,
        appConfigService: AppConfigService
      ) => factory.getService(appConfigService.getConfig().authProvider),
      deps: [UserServiceFactory, AppConfigService]
    },
    provideNgxMask(),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    {
      provide: MainApiService,
      useFactory: () => (environment.web ? new MainApiService() : window.api)
    }
  ]
})
  // eslint-disable-next-line no-console
  .catch((err) => console.error(err));
