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
import { ADD_ADMIN } from '@/graphql/mutations';
import { useMutation } from '@apollo/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

type AdminInviteProps = {
  onSuccess: () => void;
};

export function AdminInvite({ onSuccess }: AdminInviteProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Using Apollo's useMutation hook
  const [inviteAdmin, { loading: isSubmitting }] = useMutation(ADD_ADMIN, {
    onCompleted: (data) => {
      if (data.addAdmin.success) {
        setSuccess(true);
        setEmail('');
        onSuccess();
      } else {
        setError('Failed to invite admin');
      }
    },
    onError: (error) => {
      setError(error.message || 'An error occurred');
    }
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setError(null);

    try {
      await inviteAdmin({
        variables: { email }
      });
    } catch (error) {
      // Apollo's onError will handle this
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Admin</CardTitle>
        <CardDescription>
          Invite a user to become an admin of this application.
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
              Admin invitation sent successfully.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Inviting...' : 'Invite'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
