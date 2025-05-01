import { gql } from '@/graphql/__generated__';

// Team mutations
export const CREATE_TEAM = gql(/* GraphQL */ `
  mutation CreateTeam($name: String!, $description: String) {
    createTeam(name: $name, description: $description) {
      success
      teamId
      message
    }
  }
`);

export const ADD_TEAM_MEMBER = gql(/* GraphQL */ `
  mutation AddTeamMember($teamId: ID!, $email: String!, $role: String!) {
    addTeamMember(teamId: $teamId, email: $email, role: $role) {
      success
      message
    }
  }
`);

export const REMOVE_TEAM_MEMBER = gql(/* GraphQL */ `
  mutation RemoveTeamMember($teamId: ID!, $email: String!) {
    removeTeamMember(teamId: $teamId, email: $email) {
      success
      message
    }
  }
`);

// Admin mutations
export const ADD_ADMIN = gql(/* GraphQL */ `
  mutation AddAdmin($email: String!) {
    addAdmin(email: $email) {
      success
      message
    }
  }
`);

export const REMOVE_ADMIN = gql(/* GraphQL */ `
  mutation RemoveAdmin($email: String!) {
    removeAdmin(email: $email) {
      success
      message
    }
  }
`);

export const DELETE_TEAM = gql(/* GraphQL */ `
  mutation DeleteTeam($id: ID!) {
    deleteTeam(id: $id) {
      success
    }
  }
`);

export const INITIALIZE_TENANT = gql(/* GraphQL */ `
  mutation InitializeTenant($tenantName: String!) {
    initializeTenant(tenantName: $tenantName) {
      success
    }
  }
`);
