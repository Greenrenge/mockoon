'use client';

import { env } from '@/config/env';
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import React, { useMemo } from 'react';
import { useAuth } from '../auth/auth-provider';

export function ApolloProviderWrapper({
  children
}: {
  children: React.ReactNode;
}) {
  const { getAuthToken } = useAuth();

  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: env.API_URL + '/graphql'
    });

    const authLink = setContext(async (_, { headers }) => {
      // Get the authentication token from auth provider if it exists
      const token = getAuthToken();
      // Return the headers to the context so httpLink can read them
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : ''
        }
      };
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network'
        }
      }
    });
  }, [getAuthToken]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
