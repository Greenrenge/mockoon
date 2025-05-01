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

type TeamMemberInviteProps = {
  teamId: string;
  onSuccess: () => void;
};

export function TeamMemberInvite({ teamId, onSuccess }: TeamMemberInviteProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
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

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setError(null);

    try {
      await inviteTeamMember({
        variables: { email, role, teamId }
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
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
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
