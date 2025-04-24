import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  createClient,
  SignInWithOAuthCredentials,
  SupabaseClient,
  User as SupabaseUser
} from '@supabase/supabase-js';
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

@Injectable({ providedIn: 'root' })
export class UserServiceSupabase implements IUserService {
  private isWeb = Config.isWeb;
  private supabase: SupabaseClient;
  // ReplaySubject with a buffer size of 1 to store and emit the most recent auth state (SupabaseUser or null).
  // Ensures new subscribers always receive the current authentication status immediately.
  private authState$ = new ReplaySubject<SupabaseUser | null>(1);

  constructor(
    private httpClient: HttpClient,
    private store: Store,
    private uiService: UIService,
    private mainApiService: MainApiService,
    private loggerService: LoggerService,
    private appConfigService: AppConfigService
  ) {
    // Initialize Supabase client
    this.supabase =
      appConfigService.getConfig().authProvider === 'supabase'
        ? createClient(
            appConfigService.getConfig().option?.url,
            appConfigService.getConfig().option?.anonKey
          )
        : null;

    // Listen to auth state changes
    this.supabase?.auth.onAuthStateChange((event, session) => {
      this.authState$.next(session?.user || null);
    });
  }
  public getProviderTokens(): string[] {
    return ['keycloak', 'github'];
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
   *
   * @returns
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
  public authStateChanges(): Observable<SupabaseUser | null> {
    return this.authState$.asObservable();
  }

  /**
   * Get current ID token
   * @returns Observable that emits the current ID token
   */
  public getIdToken(): Observable<string | null> {
    return from(this.getIdTokenInternal());
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
    return from(this.supabase.auth.refreshSession()).pipe(
      switchMap(({ data }) => {
        if (data.session?.access_token) {
          return of(data.session.access_token);
        }

        return of(null);
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Reload user session
   */
  public reloadUser() {
    return from(this.supabase.auth.refreshSession()).pipe(
      catchError(() => EMPTY)
    );
  }

  /**
   * Start login flow based on platform (web or desktop)
   */
  public startLoginFlow() {
    if (Config.isWeb) {
      //       this.uiService.openModal('authIframe');
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
  public authCallbackHandler(_token: string) {
    return EMPTY;
  }
  /**
   * Handle web authentication callback with token
   */
  public webAuthCallbackHandler(_token: string) {
    return EMPTY;
  }

  /**
   * Authenticate with a token
   */
  public authWithToken(_token: string) {
    return EMPTY;
  }

  /**
   * Log out user and clear user data
   */
  public logout() {
    return from(this.supabase.auth.signOut()).pipe(
      tap(() => {
        this.store.update(updateUserAction(null));
        this.store.update(updateDeployInstancesAction([]));
      })
    );
  }

  /**
   * Sign in with OAuth provider
   * @param provider
   **/
  public signInWithProvider(providerToken: string) {
    return from(
      this.supabase.auth.signInWithOAuth({
        provider: providerToken as SignInWithOAuthCredentials['provider'],
        options: {
          ...(providerToken === 'keycloak' && { scopes: 'openid' })
        }
      })
    ).pipe(
      tap(() => {
        this.store.update(updateUserAction(null));
      }),
      catchError((error) => {
        this.loggerService.logMessage('error', 'LOGIN_ERROR', error.message);

        return EMPTY;
      })
    );
  }

  /**
   * Internal method to get the ID token as a Promise
   * Used by other methods that still need the Promise-based approach
   */
  private async getIdTokenInternal(): Promise<string | null> {
    const {
      data: { session }
    } = await this.supabase.auth.getSession();

    return session?.access_token || null;
  }
}
