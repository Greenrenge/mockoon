import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { filter, Observable, switchMap } from 'rxjs';
import { UserServiceSupabase } from 'src/renderer/app/services/user.service.supabase';
import { Store } from 'src/renderer/app/stores/store';
import { Config } from 'src/renderer/config';

@Injectable({ providedIn: 'root' })
export class ImportExportOpenAPIService {
  private serverUrl = '';
  constructor(
    private userService: UserServiceSupabase,
    private store: Store,
    private httpClient: HttpClient
  ) {}

  public init() {
    this.serverUrl = `${Config.apiURL}files`;
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
