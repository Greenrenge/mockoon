'use client';

import { env } from '@/config/env';
import {
  ApolloClient,
  ApolloProvider,
  from, // Import 'from'
  HttpLink,
  InMemoryCache
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error'; // Import 'onError'
import React, { useMemo } from 'react';
import { toast } from 'sonner';
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

    // Error link to handle GraphQL and network errors
    const errorLink = onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
          console.error(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
          );
          toast.error(`GraphQL error: ${message}`);
        });
      }

      if (networkError) {
        console.error(`[Network error]: ${networkError}`);
        toast.error(`Network error: ${networkError.message}`);
      }
    });

    return new ApolloClient({
      // Chain the links: errorLink -> authLink -> httpLink
      link: from([errorLink, authLink, httpLink]),
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
