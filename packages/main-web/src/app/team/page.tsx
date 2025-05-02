'use client';

import { TeamOwnerGuard } from '@/components/guards/team-owner-guard';
import { useUser } from '@/components/providers';
import { TeamDashboard } from '@/components/team/team-dashboard';
import { GET_TEAMS } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function TeamPage() {
  const { roles } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamIdFromUrl = searchParams.get('teamId');

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
    // If no teamId in URL and user has teams and not loading teams data, redirect to the first one
    if (
      !teamIdFromUrl &&
      ownedTeams.length > 0 &&
      (!isAdmin || !teamsLoading)
    ) {
      router.push(`/team?teamId=${ownedTeams[0].id}`);
    }
  }, [ownedTeams, router, isAdmin, teamsLoading, teamIdFromUrl]);

  // Show loading state if no teamId yet and we're still loading or determining the first team
  if (!teamIdFromUrl && (teamsLoading || ownedTeams.length === 0)) {
    return (
      <TeamOwnerGuard>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Team Management</h1>
          <div className="text-center py-8">Loading team data...</div>
        </div>
      </TeamOwnerGuard>
    );
  }

  return (
    <TeamOwnerGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Team Management</h1>
        <TeamDashboard initialTeamId={teamIdFromUrl || undefined} />
      </div>
    </TeamOwnerGuard>
  );
}
