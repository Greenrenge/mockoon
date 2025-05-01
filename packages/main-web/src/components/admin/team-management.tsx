'use client';

import type React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { CREATE_TEAM, DELETE_TEAM } from '@/graphql/mutations';
import { GET_TEAMS_WITH_MEMBER_COUNT } from '@/graphql/queries';
import { useMutation, useQuery } from '@apollo/client';
import { AlertCircle, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Team = {
  id: string;
  name: string;
  memberCount: number;
};

export function TeamManagement() {
  // Using Apollo's useQuery hook for fetching teams
  const {
    data,
    loading: isLoading,
    refetch
  } = useQuery(GET_TEAMS_WITH_MEMBER_COUNT, {
    fetchPolicy: 'network-only' // Don't use cache
  });

  const teams = data?.getTeams || [];

  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Using Apollo's useMutation hook for creating a team
  const [createTeam, { loading: isSubmitting }] = useMutation(CREATE_TEAM, {
    onCompleted: (data) => {
      if (data.createTeam.success) {
        setSuccess(true);
        setTeamName('');
        refetch(); // Refetch teams after creating a new one
      } else {
        setError('Failed to create team');
      }
    },
    onError: (error) => {
      setError(error.message || 'An error occurred');
    }
  });

  // Using Apollo's useMutation hook for deleting a team
  const [deleteTeam] = useMutation(DELETE_TEAM, {
    onCompleted: (data) => {
      if (data.deleteTeam.success) {
        refetch(); // Refetch teams after deleting one
      }
    },
    onError: (error) => {
      console.error('Error deleting team:', error);
    }
  });

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setError(null);

    try {
      await createTeam({
        variables: { name: teamName }
      });
    } catch (error) {
      // Error handling is done in the onError callback
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam({
        variables: { id: teamId }
      });
    } catch (error) {
      // Error handling is done in the onError callback
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
          <CardDescription>
            Create a new team for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Team created successfully.</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <Input
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading teams...
                </TableCell>
              </TableRow>
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{team.memberCount} members</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Team</DialogTitle>
                            <DialogDescription>
                              Update the team details.
                            </DialogDescription>
                          </DialogHeader>
                          <form className="space-y-4 py-4">
                            <Input
                              defaultValue={team.name}
                              placeholder="Team name"
                            />
                          </form>
                          <DialogFooter>
                            <Button type="submit">Save changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
