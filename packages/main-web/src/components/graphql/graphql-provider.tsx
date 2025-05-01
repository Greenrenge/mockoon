'use client';

import { env } from '@/config/env';
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
  gql
} from '@apollo/client';
import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../auth/auth-provider';

type GraphQLContextType = {
  query: <T>(query: string, variables?: any) => Promise<T>;
  mutation: <T>(mutation: string, variables?: any) => Promise<T>;
};

const GraphQLContext = createContext<GraphQLContextType>({
  query: async () => {
    throw new Error('GraphQL context not initialized');
  },
  mutation: async () => {
    throw new Error('GraphQL context not initialized');
  }
});

export const useGraphQL = () => useContext(GraphQLContext);

export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  // Create Apollo Client instance
  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: env.API_URL + '/graphql'
    });

    // For now, we're not adding auth headers since we don't have a getAuthToken method
    // This can be updated later when authentication is properly integrated
    return new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network'
        }
      }
    });
  }, []);

  // Compatibility layer for existing components
  const query = async <T,>(queryStr: string, variables?: any): Promise<T> => {
    try {
      const result = await client.query({
        query: gql`
          ${queryStr}
        `,
        variables,
        fetchPolicy: 'network-only'
      });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data as T;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
    }
  };

  const mutation = async <T,>(
    mutationStr: string,
    variables?: any
  ): Promise<T> => {
    try {
      const result = await client.mutate({
        mutation: gql`
          ${mutationStr}
        `,
        variables
      });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data as T;
    } catch (error) {
      console.error('GraphQL mutation error:', error);
      throw error;
    }
  };

  return (
    <ApolloProvider client={client}>
      <GraphQLContext.Provider value={{ query, mutation }}>
        {children}
      </GraphQLContext.Provider>
    </ApolloProvider>
  );
}
