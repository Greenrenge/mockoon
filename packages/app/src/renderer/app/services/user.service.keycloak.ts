import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  catchError,
  combineLatest,
  EMPTY,
  filter,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  take,
  tap
} from 'rxjs';
import { LoggerService } from 'src/renderer/app/services/logger-service';
import { MainApiService } from 'src/renderer/app/services/main-api.service';
import { UIService } from 'src/renderer/app/services/ui.service';
import {
  updateDeployInstancesAction,
  updateUserAction
} from 'src/renderer/app/stores/actions';
import { Store } from 'src/renderer/app/stores/store';
import { Config } from 'src/renderer/config';

export interface KeycloakUser {
  id: string;
  email: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class UserServiceKeycloak {
  private isWeb = Config.isWeb;
  // ReplaySubject with a buffer size of 1 to store and emit the most recent auth state
  private authState$ = new ReplaySubject<KeycloakUser | null>(1);
  private token: string | null = null;

  constructor(
    private httpClient: HttpClient,
    private store: Store,
    private uiService: UIService,
    private mainApiService: MainApiService,
    private loggerService: LoggerService
  ) {}

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
      catchError(() => EMPTY)
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
   */
  public getIdToken(): Observable<string | null> {
    return of(this.token);
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
   */
  public refreshToken(): Observable<string | null> {
    // Implement token refresh logic with Keycloak
    return EMPTY;
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
   * Handle authentication callback
   */
  public authCallbackHandler(token: string) {
    this.token = token;

    return this.validateAndSetUser(token);
  }

  /**
   * Handle web authentication callback with token
   */
  public webAuthCallbackHandler(token: string) {
    return this.validateAndSetUser(token);
  }

  /**
   * Log out user and clear user data
   */
  public logout() {
    this.token = null;
    this.authState$.next(null);
    this.store.update(updateUserAction(null));
    this.store.update(updateDeployInstancesAction([]));

    return EMPTY;
  }

  /**
   * Validate token and set user info
   */
  private validateAndSetUser(token: string): Observable<any> {
    this.token = token;

    return this.httpClient
      .get<KeycloakUser>(`${Config.apiURL}auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .pipe(
        tap((user) => {
          this.authState$.next(user);
        }),
        catchError((error) => {
          this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

          return EMPTY;
        })
      );
  }
}
