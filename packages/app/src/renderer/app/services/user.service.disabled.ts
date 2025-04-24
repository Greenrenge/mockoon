import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, ReplaySubject, switchMap, tap } from 'rxjs';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { updateUserAction } from 'src/renderer/app/stores/actions';
import { Store } from 'src/renderer/app/stores/store';
import { IUserService } from '../interfaces/user-service.interface';

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'mock@user.local',
  username: 'mockuser'
};

const MOCK_TOKEN = 'mock-auth-token';

@Injectable({ providedIn: 'root' })
export class UserServiceDisabled implements IUserService {
  private authState$ = new ReplaySubject<any>(1);

  constructor(
    private httpClient: HttpClient,
    private store: Store,
    private appConfigService: AppConfigService
  ) {
    // Initialize with mock user
    this.authState$.next(MOCK_USER);
  }

  public init(): Observable<any> {
    return this.getUserInfo();
  }

  public getProviderTokens(): string[] {
    return ['disabled'];
  }

  public getUserInfo(): Observable<any> {
    return this.getIdToken().pipe(
      switchMap((token) =>
        this.httpClient.get(`${this.appConfigService.getConfig().apiURL}user`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ),
      tap((info: any) => {
        this.store.update(updateUserAction({ ...info }));
      })
    );
  }

  public authStateChanges(): Observable<any> {
    return this.authState$.asObservable();
  }

  public getIdToken(): Observable<string> {
    return of(MOCK_TOKEN);
  }

  public idTokenChanges(): Observable<string> {
    return of(MOCK_TOKEN);
  }

  public refreshToken(): Observable<string> {
    return of(MOCK_TOKEN);
  }

  public reloadUser(): Observable<any> {
    return this.getUserInfo();
  }

  public startLoginFlow(): void {
    // No-op for disabled auth
  }

  public stopAuthFlow(): void {
    // No-op for disabled auth
  }

  public webAuthHandler(): Observable<any> {
    return of([MOCK_USER, { welcomeShown: true }]);
  }

  public authCallbackHandler(_token: string): Observable<boolean> {
    return of(true);
  }

  public webAuthCallbackHandler(_token: string): Observable<boolean> {
    return of(true);
  }

  public authWithToken(_token: string): Observable<boolean> {
    return of(true);
  }

  public logout(): Observable<null> {
    return of(null);
  }

  public signInWithProvider(_providerToken: string): Observable<boolean> {
    return of(true);
  }
}
