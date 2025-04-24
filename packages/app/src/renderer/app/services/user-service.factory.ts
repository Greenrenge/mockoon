import { Injectable } from '@angular/core';
import { IUserService } from '../interfaces/user-service.interface';
import { UserServiceDisabled } from './user.service.disabled';
import { UserServiceKeycloak } from './user.service.keycloak';
import { UserServiceSupabase } from './user.service.supabase';

@Injectable({ providedIn: 'root' })
export class UserServiceFactory {
  constructor(
    private supabaseService: UserServiceSupabase,
    private keycloakService: UserServiceKeycloak,
    private disabledService: UserServiceDisabled
  ) {}

  public getService(authProvider: string): IUserService {
    switch (authProvider) {
      case 'keycloak':
        return this.keycloakService;
      case 'supabase':
        return this.supabaseService;
      case 'disabled':
        return this.disabledService;
      default:
        return this.disabledService;
    }
  }
}
