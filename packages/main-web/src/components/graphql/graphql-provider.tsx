'use client';

import { env } from '@/config/env';
import type React from 'react';

import { createContext, useContext } from 'react';

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
  const query = async <T,>(query: string, variables?: any): Promise<T> => {
    try {
      const response = await fetch(env.API_URL + '/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0].message);
      }

      return data;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
    }
  };

  const mutation = async <T,>(
    mutation: string,
    variables?: any
  ): Promise<T> => {
    try {
      const response = await fetch(env.API_URL + '/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: mutation,
          variables
        })
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0].message);
      }

      return data;
    } catch (error) {
      console.error('GraphQL mutation error:', error);
      throw error;
    }
  };

  return (
    <GraphQLContext.Provider value={{ query, mutation }}>
      {children}
    </GraphQLContext.Provider>
  );
}
