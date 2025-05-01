import { gql } from '@/graphql/__generated__';

// Team-related mutations
export const ADD_TEAM_MEMBER = gql(/* GraphQL */ `
  mutation AddTeamMember($teamId: ID!, $email: String!, $role: String!) {
    addTeamMember(teamId: $teamId, email: $email, role: $role) {
      success
      message
    }
  }
`);

export const UPDATE_TEAM_MEMBER_ROLE = gql(/* GraphQL */ `
  mutation UpdateTeamMemberRole($teamId: ID!, $email: String!, $role: String!) {
    updateTeamMemberRole(teamId: $teamId, email: $email, role: $role) {
      success
      message
    }
  }
`);

export const REMOVE_TEAM_MEMBER_BY_EMAIL = gql(/* GraphQL */ `
  mutation RemoveTeamMemberByEmail($teamId: ID!, $email: String!) {
    removeTeamMember(teamId: $teamId, email: $email) {
      success
      message
    }
  }
`);
