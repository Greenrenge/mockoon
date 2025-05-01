/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation InitializeApp($tenantName: String!) {\n    initializeApp(tenantName: $tenantName) {\n      success\n      message\n      tenantName\n    }\n  }\n": typeof types.InitializeAppDocument,
    "\n  mutation CreateTeam($name: String!, $description: String) {\n    createTeam(name: $name, description: $description) {\n      success\n      teamId\n      message\n    }\n  }\n": typeof types.CreateTeamDocument,
    "\n  mutation AddTeamMember($teamId: ID!, $email: String!, $role: String!) {\n    addTeamMember(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n": typeof types.AddTeamMemberDocument,
    "\n  mutation RemoveTeamMember($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n": typeof types.RemoveTeamMemberDocument,
    "\n  mutation AddAdmin($email: String!) {\n    addAdmin(email: $email) {\n      success\n      message\n    }\n  }\n": typeof types.AddAdminDocument,
    "\n  mutation RemoveAdmin($email: String!) {\n    removeAdmin(email: $email) {\n      success\n      message\n    }\n  }\n": typeof types.RemoveAdminDocument,
    "\n  query GetInitializationStatus {\n    getInitializationStatus {\n      initialized\n      tenantName\n      initializedAt\n    }\n  }\n": typeof types.GetInitializationStatusDocument,
    "\n  query Me {\n    me {\n      id\n      uid\n      email\n      displayName\n      createdAt\n      updatedAt\n      teams {\n        id\n        name\n        description\n      }\n      plan\n      teamId\n      teamRole\n      isAdmin\n    }\n  }\n": typeof types.MeDocument,
    "\n  query GetTeams {\n    getTeams {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetTeamsDocument,
    "\n  query GetTeam($teamId: ID!) {\n    getTeam(teamId: $teamId) {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.GetTeamDocument,
    "\n  query GetAdmins {\n    getAdmins {\n      id\n      email\n      invitedBy\n      invitedAt\n      joinedAt\n    }\n  }\n": typeof types.GetAdminsDocument,
    "\n  mutation UpdateTeamMemberRole($teamId: ID!, $email: String!, $role: String!) {\n    updateTeamMemberRole(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n": typeof types.UpdateTeamMemberRoleDocument,
    "\n  mutation RemoveTeamMemberByEmail($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n": typeof types.RemoveTeamMemberByEmailDocument,
};
const documents: Documents = {
    "\n  mutation InitializeApp($tenantName: String!) {\n    initializeApp(tenantName: $tenantName) {\n      success\n      message\n      tenantName\n    }\n  }\n": types.InitializeAppDocument,
    "\n  mutation CreateTeam($name: String!, $description: String) {\n    createTeam(name: $name, description: $description) {\n      success\n      teamId\n      message\n    }\n  }\n": types.CreateTeamDocument,
    "\n  mutation AddTeamMember($teamId: ID!, $email: String!, $role: String!) {\n    addTeamMember(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n": types.AddTeamMemberDocument,
    "\n  mutation RemoveTeamMember($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n": types.RemoveTeamMemberDocument,
    "\n  mutation AddAdmin($email: String!) {\n    addAdmin(email: $email) {\n      success\n      message\n    }\n  }\n": types.AddAdminDocument,
    "\n  mutation RemoveAdmin($email: String!) {\n    removeAdmin(email: $email) {\n      success\n      message\n    }\n  }\n": types.RemoveAdminDocument,
    "\n  query GetInitializationStatus {\n    getInitializationStatus {\n      initialized\n      tenantName\n      initializedAt\n    }\n  }\n": types.GetInitializationStatusDocument,
    "\n  query Me {\n    me {\n      id\n      uid\n      email\n      displayName\n      createdAt\n      updatedAt\n      teams {\n        id\n        name\n        description\n      }\n      plan\n      teamId\n      teamRole\n      isAdmin\n    }\n  }\n": types.MeDocument,
    "\n  query GetTeams {\n    getTeams {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetTeamsDocument,
    "\n  query GetTeam($teamId: ID!) {\n    getTeam(teamId: $teamId) {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n": types.GetTeamDocument,
    "\n  query GetAdmins {\n    getAdmins {\n      id\n      email\n      invitedBy\n      invitedAt\n      joinedAt\n    }\n  }\n": types.GetAdminsDocument,
    "\n  mutation UpdateTeamMemberRole($teamId: ID!, $email: String!, $role: String!) {\n    updateTeamMemberRole(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n": types.UpdateTeamMemberRoleDocument,
    "\n  mutation RemoveTeamMemberByEmail($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n": types.RemoveTeamMemberByEmailDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation InitializeApp($tenantName: String!) {\n    initializeApp(tenantName: $tenantName) {\n      success\n      message\n      tenantName\n    }\n  }\n"): (typeof documents)["\n  mutation InitializeApp($tenantName: String!) {\n    initializeApp(tenantName: $tenantName) {\n      success\n      message\n      tenantName\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateTeam($name: String!, $description: String) {\n    createTeam(name: $name, description: $description) {\n      success\n      teamId\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTeam($name: String!, $description: String) {\n    createTeam(name: $name, description: $description) {\n      success\n      teamId\n      message\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation AddTeamMember($teamId: ID!, $email: String!, $role: String!) {\n    addTeamMember(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation AddTeamMember($teamId: ID!, $email: String!, $role: String!) {\n    addTeamMember(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation RemoveTeamMember($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveTeamMember($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation AddAdmin($email: String!) {\n    addAdmin(email: $email) {\n      success\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation AddAdmin($email: String!) {\n    addAdmin(email: $email) {\n      success\n      message\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation RemoveAdmin($email: String!) {\n    removeAdmin(email: $email) {\n      success\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveAdmin($email: String!) {\n    removeAdmin(email: $email) {\n      success\n      message\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetInitializationStatus {\n    getInitializationStatus {\n      initialized\n      tenantName\n      initializedAt\n    }\n  }\n"): (typeof documents)["\n  query GetInitializationStatus {\n    getInitializationStatus {\n      initialized\n      tenantName\n      initializedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query Me {\n    me {\n      id\n      uid\n      email\n      displayName\n      createdAt\n      updatedAt\n      teams {\n        id\n        name\n        description\n      }\n      plan\n      teamId\n      teamRole\n      isAdmin\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      id\n      uid\n      email\n      displayName\n      createdAt\n      updatedAt\n      teams {\n        id\n        name\n        description\n      }\n      plan\n      teamId\n      teamRole\n      isAdmin\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetTeams {\n    getTeams {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetTeams {\n    getTeams {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetTeam($teamId: ID!) {\n    getTeam(teamId: $teamId) {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query GetTeam($teamId: ID!) {\n    getTeam(teamId: $teamId) {\n      id\n      name\n      description\n      createdBy\n      createdAt\n      updatedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAdmins {\n    getAdmins {\n      id\n      email\n      invitedBy\n      invitedAt\n      joinedAt\n    }\n  }\n"): (typeof documents)["\n  query GetAdmins {\n    getAdmins {\n      id\n      email\n      invitedBy\n      invitedAt\n      joinedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateTeamMemberRole($teamId: ID!, $email: String!, $role: String!) {\n    updateTeamMemberRole(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTeamMemberRole($teamId: ID!, $email: String!, $role: String!) {\n    updateTeamMemberRole(teamId: $teamId, email: $email, role: $role) {\n      success\n      message\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation RemoveTeamMemberByEmail($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveTeamMemberByEmail($teamId: ID!, $email: String!) {\n    removeTeamMember(teamId: $teamId, email: $email) {\n      success\n      message\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;