import { Injectable } from '@angular/core';
import { IUserService } from '../interfaces/user-service.interface';
import { UserServiceKeycloak } from './user.service.keycloak';
import { UserServiceSupabase } from './user.service.supabase';

@Injectable({ providedIn: 'root' })
export class UserServiceFactory {
  constructor(
    private supabaseService: UserServiceSupabase,
    private keycloakService: UserServiceKeycloak
  ) {}

  public getService(authProvider: string): IUserService {
    switch (authProvider) {
      case 'keycloak':
        return this.keycloakService;
      case 'supabase':
      default:
        return this.supabaseService;
    }
  }
}
