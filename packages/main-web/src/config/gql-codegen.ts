import 'dotenv/config';

/** @type {import('graphql-config').IGraphQLConfig } */
import appConfig from '.';

export const projects = {
  main: {
    ignoreNoDocuments: true,
    schema: appConfig.graphqlUrl,
    documents: ['../../src/**/*.{ts,tsx,graphql}'],
    extensions: {
      codegen: {
        generates: {
          '../graphql/__generated__/': {
            preset: 'client',
            presetConfig: {
              gqlTagName: 'gql',
              fragmentMasking: { unmaskFunctionName: 'getFragmentData' }
            }
            // plugins: [
            //   // 'typescript',
            //   'gql-tag-operations',
            //   // 'typed-document-node',
            //   // 'typescript-operations',
            // ],
          }
        }
      }
    }
  }
};
