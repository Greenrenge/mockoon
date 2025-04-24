import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { filter, Observable, switchMap } from 'rxjs';
import { AppConfigService } from 'src/renderer/app/services/app-config.services';
import { Store } from 'src/renderer/app/stores/store';
import {
  IUserService,
  USER_SERVICE_TOKEN
} from '../interfaces/user-service.interface';
import { UserServiceFactory } from './user-service.factory';

@Injectable({ providedIn: 'root' })
export class ImportExportOpenAPIService {
  private serverUrl = '';

  constructor(
    userServiceFactory: UserServiceFactory,
    private store: Store,
    private httpClient: HttpClient,
    private appConfig: AppConfigService,
    @Inject(USER_SERVICE_TOKEN) private userService: IUserService
  ) {}

  public init() {
    this.serverUrl = `${this.appConfig.getConfig().apiURL}files`;
  }

  public uploadOpenAPIFile(formData: FormData): Observable<any> {
    return this.userService.getIdToken().pipe(
      filter((token) => !!token),
      switchMap((token) =>
        this.httpClient.put(`${this.serverUrl}/import-open-api`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      )
    );
  }

  public downloadOpenAPIFile(environmentUuid: string) {
    return this.userService.getIdToken().pipe(
      filter((token) => !!token),
      switchMap((token) =>
        this.httpClient.get(
          `${this.serverUrl}/export-open-api/${environmentUuid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          }
        )
      )
    );
  }
}
