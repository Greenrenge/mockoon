import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IUserService {
  init(): Observable<any>;
  getProviderTokens(): string[];
  getUserInfo(): Observable<any>;
  authStateChanges(): Observable<any>;
  getIdToken(): Observable<string | null>;
  idTokenChanges(): Observable<string | null>;
  refreshToken(): Observable<string | null>;
  reloadUser(): Observable<any>;
  startLoginFlow(): void;
  stopAuthFlow(): void;
  webAuthHandler(): Observable<any>;
  authCallbackHandler(token: string): Observable<any>;
  webAuthCallbackHandler(token: string): Observable<any>;
  authWithToken(token: string): Observable<any>;
  logout(): Observable<any>;
  signInWithProvider(providerToken: string): Observable<any>;
}

export const USER_SERVICE_TOKEN = new InjectionToken<IUserService>(
  'IUserService'
);
