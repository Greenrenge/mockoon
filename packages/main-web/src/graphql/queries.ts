import { gql } from '@/graphql/__generated__';

// Define your GraphQL queries here
export const GET_INITIALIZATION_STATUS = gql(/* GraphQL */ `
  query GetInitializationStatus {
    getInitializationStatus {
      initialized
      tenantName
      initializedAt
    }
  }
`);

export const ME_QUERY = gql(/* GraphQL */ `
  query Me {
    me {
      id
      uid
      email
      displayName
      createdAt
      updatedAt
      teams {
        id
        name
        description
      }
      plan
      teamId
      teamRole
      isAdmin
    }
  }
`);

// Teams queries
export const GET_TEAMS = gql(/* GraphQL */ `
  query GetTeams {
    getTeams {
      id
      name
      description
      createdBy
      createdAt
      updatedAt
    }
  }
`);

export const GET_TEAM = gql(/* GraphQL */ `
  query GetTeam($teamId: ID!) {
    getTeam(teamId: $teamId) {
      id
      name
      description
      createdBy
      createdAt
      updatedAt
    }
  }
`);

// Admins query
export const GET_ADMINS = gql(/* GraphQL */ `
  query GetAdmins {
    getAdmins {
      id
      email
      invitedBy
      invitedAt
      joinedAt
    }
  }
`);
