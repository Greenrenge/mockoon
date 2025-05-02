'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GET_TEAM_MEMBERS, GET_TEAMS } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useUser } from '../providers';
import { TeamMemberInvite } from './team-member-invite';
import { TeamMemberList } from './team-member-list';

export function TeamDashboard() {
  const { roles } = useUser();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Check if the user is an admin
  const isAdmin = roles.isAdmin || false;

  // Get all teams if the user is an admin
  const { data: teamsData, loading: teamsLoading } = useQuery(GET_TEAMS, {
    skip: !isAdmin, // Only fetch if admin
    fetchPolicy: 'network-only'
  });

  // Filter owned teams for non-admin users
  const ownedTeams = isAdmin
    ? teamsData?.getTeams || []
    : roles.teams.filter((team) => team.role === 'owner');

  useEffect(() => {
    if (ownedTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(ownedTeams[0].id);
    }
  }, [ownedTeams, selectedTeamId]);

  // Using Apollo's useQuery hook instead of manual fetching
  const {
    data,
    loading: isLoading,
    refetch
  } = useQuery(GET_TEAM_MEMBERS, {
    variables: { teamId: selectedTeamId || '' },
    skip: !selectedTeamId, // Skip the query if no team is selected
    fetchPolicy: 'network-only' // Don't use cache
  });

  const teamMembers = data?.teamMembers || [];

  // Function to refetch team members data
  const fetchTeamMembers = async () => {
    if (selectedTeamId) {
      try {
        await refetch({ teamId: selectedTeamId });
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {ownedTeams.length === 0 && (
        <div className="border rounded-md p-6">
          <h3 className="text-lg font-medium mb-4">No Teams Found</h3>
          <p className="text-muted-foreground">
            You are not a member of any teams. Please contact an admin to be
            added to a team.
          </p>
        </div>
      )}
      {ownedTeams.length === 1 && (
        <div className="border rounded-md p-6">
          <h3 className="text-lg font-medium mb-4">
            You are a member of the following team:
          </h3>
          <p className="text-muted-foreground">{ownedTeams[0].name}</p>
        </div>
      )}
      {ownedTeams.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="team-select" className="text-sm font-medium">
            Select Team:
          </label>
          <Select
            value={selectedTeamId || ''}
            onValueChange={(value) => setSelectedTeamId(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {ownedTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {selectedTeamId && (
        <Tabs defaultValue="members">
          <TabsList className="mb-6">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="settings">Team Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <TeamMemberInvite
              teamId={selectedTeamId}
              onSuccess={fetchTeamMembers}
              members={teamMembers} // Pass the members list
            />
            <TeamMemberList
              teamId={selectedTeamId}
              members={teamMembers}
              isLoading={isLoading || (isAdmin && teamsLoading)}
              onMemberUpdated={fetchTeamMembers}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="border rounded-md p-6">
              <h3 className="text-lg font-medium mb-4">Team Settings</h3>
              <p className="text-muted-foreground">
                Team settings management will be implemented in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
