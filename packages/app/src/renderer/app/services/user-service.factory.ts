import { Injectable } from '@angular/core';
import { Config } from 'src/renderer/config';
import { IUserService } from '../interfaces/user-service.interface';
import { UserServiceKeycloak } from './user.service.keycloak';
import { UserServiceSupabase } from './user.service.supabase';

@Injectable({ providedIn: 'root' })
export class UserServiceFactory {
  constructor(
    private supabaseService: UserServiceSupabase,
    private keycloakService: UserServiceKeycloak
  ) {}

  public getService(): IUserService {
    switch (Config.authProvider) {
      case 'keycloak':
        return this.keycloakService;
      case 'supabase':
      default:
        return this.supabaseService;
    }
  }
}
