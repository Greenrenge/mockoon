'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { REMOVE_TEAM_MEMBER } from '@/graphql/mutations';
import { UPDATE_TEAM_MEMBER_ROLE } from '@/graphql/team-mutations';
import { formatDate } from '@/lib/utils';
import { useMutation } from '@apollo/client';
import { Trash2 } from 'lucide-react';

type TeamMember = {
  id: string;
  email: string;
  role: string;
  joinedAt?: string | null;
};

type TeamMemberListProps = {
  teamId: string;
  members: TeamMember[];
  isLoading: boolean;
  onMemberUpdated: () => void;
};

export function TeamMemberList({
  teamId,
  members,
  isLoading,
  onMemberUpdated
}: TeamMemberListProps) {
  // Using Apollo's useMutation hook for updating team member role
  const [updateTeamMemberRole] = useMutation(UPDATE_TEAM_MEMBER_ROLE, {
    onCompleted: (data) => {
      if (data.updateTeamMemberRole.success) {
        onMemberUpdated();
      }
    },
    onError: (error) => {
      console.error('Error updating role:', error);
    }
  });

  // Using Apollo's useMutation hook for removing team members
  const [removeTeamMember] = useMutation(REMOVE_TEAM_MEMBER, {
    onCompleted: (data) => {
      if (data.removeTeamMember.success) {
        onMemberUpdated();
      }
    },
    onError: (error) => {
      console.error('Error removing member:', error);
    }
  });

  const handleRoleChange = async (email: string, role: string) => {
    try {
      await updateTeamMemberRole({
        variables: { teamId, email, role }
      });
    } catch (error) {
      // Error handling is done in the onError callback
    }
  };

  const handleRemoveMember = async (email: string) => {
    try {
      await removeTeamMember({
        variables: { teamId, email }
      });
    } catch (error) {
      // Error handling is done in the onError callback
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                Loading team members...
              </TableCell>
            </TableRow>
          ) : members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                No team members found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.email}>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.email, value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {member.joinedAt ? formatDate(member.joinedAt) : 'Pending'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMember(member.email)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
