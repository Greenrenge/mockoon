import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { RemoteConfigData } from '@mockoon/cloud';
import { BehaviorSubject, EMPTY, Observable, from } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  switchMap,
  tap
} from 'rxjs/operators';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { Config } from 'src/renderer/config';
import {
  IUserService,
  USER_SERVICE_TOKEN
} from '../interfaces/user-service.interface';

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  private remoteConfig$ = new BehaviorSubject<RemoteConfigData>(null);

  constructor(
    private httpClient: HttpClient,
    @Inject(USER_SERVICE_TOKEN) private userService: IUserService,
    private appConfig: AppConfigService
  ) {}

  /**
   * Get a remote config specific property
   *
   * @param path
   */
  public get<T extends keyof RemoteConfigData>(
    path: T
  ): Observable<RemoteConfigData[T]> {
    return this.remoteConfig$.asObservable().pipe(
      map((remoteConfig) => remoteConfig?.[path]),
      distinctUntilChanged()
    );
  }

  /**
   * Monitor auth state and update the store
   */
  public init() {
    return this.userService
      .idTokenChanges()
      .pipe(switchMap(() => this.fetchConfig()));
  }

  /**
   * Fetch the remote config
   */
  public fetchConfig(): Observable<RemoteConfigData> {
    return from(this.userService.getIdToken()).pipe(
      switchMap((token) => {
        const headers = token
          ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
          : undefined;

        return this.httpClient
          .post<RemoteConfigData>(
            `${this.appConfig.getConfig().apiURL}remoteconfig`,
            { version: Config.appVersion },
            {
              headers
            }
          )
          .pipe(catchError(() => EMPTY));
      }),
      tap((config) => {
        this.remoteConfig$.next(config);
      })
    );
  }
}
