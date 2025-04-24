import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
export type AppConfig = {
  websiteURL?: string;
  apiURL?: string;
  authProvider?: string;
  option: {
    url?: string;
    realm?: string;
    clientId?: string;
    anonKey?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig = null;
  constructor(@Inject(HttpClient) private httpClient: HttpClient) {}

  public load() {
    return firstValueFrom(
      this.httpClient.get<AppConfig>(`/public/web-config`).pipe(
        tap((config) => {
          this.config = config;
        })
      )
    );
  }

  public getConfig(): AppConfig | null {
    return this.config;
  }

  public getAuthProvider(): string {
    return this.config?.authProvider || 'supabase';
  }
}
