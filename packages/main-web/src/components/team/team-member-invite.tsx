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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ADD_TEAM_MEMBER } from '@/graphql/mutations';
import { useMutation } from '@apollo/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

// Define the type for a team member
type TeamMember = {
  id: string;
  email: string;
  role: string;
  joinedAt?: Date;
};

type TeamMemberInviteProps = {
  teamId: string;
  onSuccess: () => void;
  members: TeamMember[]; // Add members prop
};

export function TeamMemberInvite({
  teamId,
  onSuccess,
  members
}: TeamMemberInviteProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Using Apollo's useMutation hook
  const [inviteTeamMember, { loading: isSubmitting }] = useMutation(
    ADD_TEAM_MEMBER,
    {
      onCompleted: (data) => {
        if (data.addTeamMember.success) {
          setSuccess(true);
          setEmail('');
          onSuccess();
        } else {
          setError('Failed to invite team member');
        }
      },
      onError: (error) => {
        setError(error.message || 'An error occurred');
      }
    }
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    // Check if email already exists in the members list (case-insensitive)
    if (
      members.some(
        (member) => member.email.toLowerCase() === trimmedEmail.toLowerCase()
      )
    ) {
      setError('This email address is already a member of the team.');
      return;
    }

    setError(null);
    setSuccess(false); // Reset success state on new attempt

    try {
      await inviteTeamMember({
        variables: { email: trimmedEmail, role, teamId }
      });
    } catch (error) {
      // Apollo's onError will handle this
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
        <CardDescription>
          Invite a user to join this team with specific permissions.
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
            <AlertDescription>
              Team member invited successfully.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Select
              value={role}
              onValueChange={setRole}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Inviting...' : 'Invite Member'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
