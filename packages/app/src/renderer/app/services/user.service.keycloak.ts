import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { AutoRefreshTokenService } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import {
  catchError,
  combineLatest,
  EMPTY,
  filter,
  from,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  take,
  tap
} from 'rxjs';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { LoggerService } from 'src/renderer/app/services/logger-service';
import { MainApiService } from 'src/renderer/app/services/main-api.service';
import { UIService } from 'src/renderer/app/services/ui.service';
import {
  updateDeployInstancesAction,
  updateUserAction
} from 'src/renderer/app/stores/actions';
import { Store } from 'src/renderer/app/stores/store';
import { Config } from 'src/renderer/config';
import { IUserService } from '../interfaces/user-service.interface';

export interface KeycloakUser {
  id: string;
  email: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class UserServiceKeycloak implements IUserService {
  private isWeb = Config.isWeb;
  private authState$ = new ReplaySubject<KeycloakUser | null>(1);
  private token: string | null = null;

  constructor(
    private httpClient: HttpClient,
    private store: Store,
    private uiService: UIService,
    private mainApiService: MainApiService,
    private loggerService: LoggerService,
    private appConfigService: AppConfigService,
    @Inject(Keycloak) private keycloak: Keycloak,
    @Inject(AutoRefreshTokenService)
    private autoRefreshTokenService: AutoRefreshTokenService
  ) {
    // Initialize Keycloak client if needed
    this.setupAuthStateMonitoring();
    autoRefreshTokenService.start({
      onInactivityTimeout: 'logout',
      sessionTimeout: 50000
    });
  }

  public getProviderTokens(): string[] {
    return ['keycloak'];
  }

  /**
   * Monitor auth token state and update the store
   */
  public init() {
    return this.idTokenChanges().pipe(
      filter((token) => !!token),
      mergeMap(() => this.getUserInfo())
    );
  }

  /**
   * Get user info from the server and update the store
   */
  public getUserInfo() {
    return this.getIdToken().pipe(
      switchMap((token) =>
        token
          ? this.httpClient.get(`${Config.apiURL}user`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          : EMPTY
      ),
      tap((info: any) => {
        this.store.update(updateUserAction({ ...info }));
      }),
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return EMPTY;
      })
    );
  }

  /**
   * Get observable of authentication state changes
   */
  public authStateChanges(): Observable<KeycloakUser | null> {
    return this.authState$.asObservable();
  }

  /**
   * Get current ID token
   * @returns Observable that emits the current ID token
   */
  public getIdToken(): Observable<string | null> {
    if (!this.keycloak) {
      return of(null);
    }

    return of(this.keycloak.token || null);
  }

  /**
   * Get observable of ID token changes
   */
  public idTokenChanges(): Observable<string | null> {
    return this.authStateChanges().pipe(
      mergeMap((user) => {
        if (!user) return of(null);

        return this.getIdToken();
      })
    );
  }

  /**
   * Force refresh the auth token
   * Returns an Observable with the new token
   */
  public refreshToken(): Observable<string | null> {
    if (!this.keycloak) {
      return of(null);
    }

    return from(this.keycloak.updateToken(30)).pipe(
      switchMap((refreshed) => {
        if (refreshed) {
          this.token = this.keycloak.token || null;

          return of(this.token);
        }

        return of(this.keycloak.token || null);
      }),
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return of(null);
      })
    );
  }

  /**
   * Reload user session
   */
  public reloadUser() {
    return this.refreshToken().pipe(
      switchMap(() =>
        this.keycloak ? from(this.keycloak.loadUserProfile()) : EMPTY
      ),
      tap((profile: any) => {
        if (profile) {
          const user: KeycloakUser = {
            id: profile.id || this.keycloak?.subject || '',
            email: profile.email || '',
            username: profile.username || ''
          };
          this.authState$.next(user);
        }
      }),
      catchError(() => EMPTY)
    );
  }

  /**
   * Start login flow based on platform (web or desktop)
   */
  public startLoginFlow() {
    if (Config.isWeb) {
      this.uiService.openModal('authCustomProvider');
    } else {
      this.uiService.openModal('auth');
      this.mainApiService.send('APP_AUTH');
    }
  }

  /**
   * Stop authentication flow
   */
  public stopAuthFlow() {
    this.mainApiService.send('APP_AUTH_STOP_SERVER');
  }

  /**
   * Handle web authentication flow
   */
  public webAuthHandler() {
    return combineLatest([
      this.authStateChanges(),
      this.store.select('settings')
    ]).pipe(
      take(1),
      tap(([user, settings]) => {
        if (!user && settings.welcomeShown) {
          this.uiService.openModal('authCustomProvider');
        }
      })
    );
  }

  /**
   * Handle authentication callback with token
   */
  public authCallbackHandler(token: string) {
    if (!this.keycloak) {
      return EMPTY;
    }

    return from(
      this.keycloak.init({
        token,
        onLoad: 'check-sso',
        checkLoginIframe: false
      })
    ).pipe(
      tap((authenticated) => {
        if (authenticated) {
          this.token = this.keycloak.token || null;
          // Let the onAuthSuccess handler update the auth state
        } else {
          this.authState$.next(null);
        }
      }),
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return EMPTY;
      })
    );
  }

  /**
   * Handle web authentication callback with token
   */
  public webAuthCallbackHandler(token: string) {
    return this.authCallbackHandler(token);
  }

  /**
   * Authenticate with a token
   */
  public authWithToken(token: string) {
    if (!this.keycloak) {
      return EMPTY;
    }

    this.token = token;

    return from(
      this.keycloak.init({
        token,
        onLoad: 'check-sso',
        checkLoginIframe: false
      })
    ).pipe(
      tap((authenticated) => {
        if (authenticated) {
          // Let the onAuthSuccess handler update the auth state
        } else {
          this.authState$.next(null);
        }
      }),
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return EMPTY;
      })
    );
  }

  /**
   * Log out user and clear user data
   */
  public logout() {
    if (!this.keycloak) {
      return EMPTY;
    }

    return from(this.keycloak.logout()).pipe(
      tap(() => {
        this.authState$.next(null);
        this.token = null;
        this.store.update(updateUserAction(null));
        this.store.update(updateDeployInstancesAction([]));
      }),
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return EMPTY;
      })
    );
  }

  /**
   * Sign in with OAuth provider
   * @param providerToken
   **/
  public signInWithProvider(providerToken: string) {
    if (!this.keycloak || providerToken !== 'keycloak') {
      return EMPTY;
    }

    return from(
      this.keycloak.login({
        redirectUri: window.location.origin
      })
    ).pipe(
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return EMPTY;
      })
    );
  }

  /**
   * Set up monitoring of the auth state
   */
  private setupAuthStateMonitoring() {
    if (!this.keycloak) return;

    this.keycloak.onTokenExpired = () => {
      this.refreshToken().subscribe();
    };

    this.keycloak.onAuthSuccess = () => {
      if (this.keycloak.token) {
        this.token = this.keycloak.token;

        // Extract user information from token or profile
        this.keycloak
          .loadUserProfile()
          .then((profile) => {
            const user: KeycloakUser = {
              id: profile.id || this.keycloak.subject || '',
              email: profile.email || '',
              username: profile.username || ''
            };

            this.authState$.next(user);
          })
          .catch((error) => {
            this.loggerService.logMessage(
              'error',
              'LOGIN_ERROR',
              error.message
            );
            this.authState$.next(null);
          });
      }
    };

    this.keycloak.onAuthError = () => {
      this.authState$.next(null);
      this.token = null;
    };

    this.keycloak.onAuthLogout = () => {
      this.authState$.next(null);
      this.token = null;
    };
  }
}
