'use client';

import type React from 'react';

import { ApolloProviderWrapper } from '@/components/graphql/apollo-provider';
import { env } from '@/config/env';
import { createContext, useContext, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/auth-provider';

type UserRole = {
  isAdmin: boolean;
  isTeamMember: boolean;
  isTeamOwner: boolean;
  teams: { id: string; name: string; role: string }[];
};

type UserContextType = {
  user: {
    id?: string;
    email?: string;
    displayName?: string;
  } | null;
  roles: UserRole;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  roles: {
    isAdmin: false,
    isTeamMember: false,
    isTeamOwner: false,
    teams: []
  },
  isLoading: true,
  refetchUser: async () => {}
});

export const useUser = () => useContext(UserContext);

function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserContextType['user']>(null);
  const [roles, setRoles] = useState<UserRole>({
    isAdmin: false,
    isTeamMember: false,
    isTeamOwner: false,
    teams: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { getAuthToken, isAuthenticated } = useAuth();

  const fetchUserData = async () => {
    try {
      // This would be replaced with an actual GraphQL query
      const response = await fetch(env.API_URL + '/api/tenants/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();

      setUser(data.user);

      // Set roles based on the response
      setRoles({
        isAdmin: data.isAdmin || false,
        isTeamMember: data.teams?.length > 0 || false,
        isTeamOwner:
          data.teams?.some((team: any) => team.role === 'OWNER') || false,
        teams: data.teams || []
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      fetchUserData();
    }
  }, [getAuthToken, isAuthenticated]);

  return (
    <UserContext.Provider
      value={{ user, roles, isLoading, refetchUser: fetchUserData }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ApolloProviderWrapper>
        <UserProvider>{children}</UserProvider>
      </ApolloProviderWrapper>
    </AuthProvider>
  );
}
