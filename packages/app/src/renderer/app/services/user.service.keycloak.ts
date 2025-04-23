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
    private loggerService: LoggerService
  ) {}

  public getProviderTokens(): string[] {
    return ['keycloak'];
  }

  public init() {
    return this.idTokenChanges().pipe(
      filter((token) => !!token),
      mergeMap(() => this.getUserInfo())
    );
  }

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

  public authStateChanges(): Observable<KeycloakUser | null> {
    return this.authState$.asObservable();
  }

  public getIdToken(): Observable<string | null> {
    return of(this.token);
  }

  public idTokenChanges(): Observable<string | null> {
    return this.authStateChanges().pipe(
      mergeMap((user) => {
        if (!user) return of(null);

        return this.getIdToken();
      })
    );
  }

  public refreshToken(): Observable<string | null> {
    // TODO: Implement Keycloak token refresh
    return EMPTY;
  }

  public reloadUser() {
    return this.validateAndSetUser(this.token);
  }

  public startLoginFlow() {
    if (Config.isWeb) {
      this.uiService.openModal('authCustomProvider');
    } else {
      this.uiService.openModal('auth');
      this.mainApiService.send('APP_AUTH');
    }
  }

  public stopAuthFlow() {
    this.mainApiService.send('APP_AUTH_STOP_SERVER');
  }

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

  public authCallbackHandler(token: string) {
    this.token = token;

    return this.validateAndSetUser(token);
  }

  public webAuthCallbackHandler(token: string) {
    return this.validateAndSetUser(token);
  }

  public authWithToken(token: string) {
    return this.validateAndSetUser(token);
  }

  public logout() {
    this.token = null;
    this.authState$.next(null);
    this.store.update(updateUserAction(null));
    this.store.update(updateDeployInstancesAction([]));

    return EMPTY;
  }

  public signInWithProvider(providerToken: string) {
    // Keycloak implementation would initialize login flow here
    // This is a placeholder that needs to be implemented
    return EMPTY;
  }

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
