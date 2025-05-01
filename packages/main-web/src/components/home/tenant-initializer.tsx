'use client';

import type React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { INITIALIZE_TENANT } from '@/graphql/mutations';
import { GET_INITIALIZATION_STATUS } from '@/graphql/queries';
import { useMutation, useQuery } from '@apollo/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-provider';
import { useUser } from '../providers';

export function TenantInitializer() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { refetchUser } = useUser();

  const [tenantName, setTenantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Using Apollo's useQuery hook for checking initialization status
  const {
    data,
    loading: isLoading,
    refetch,
    called
  } = useQuery(GET_INITIALIZATION_STATUS, {
    skip: !isAuthenticated || authLoading, // Skip if not authenticated or auth is loading
    fetchPolicy: 'network-only' // Don't use cache
  });

  const isInitialized = data?.getInitializationStatus.initialized || null;

  // Using Apollo's useMutation hook for initializing tenant
  const [initializeTenant, { loading: isSubmitting }] = useMutation(
    INITIALIZE_TENANT,
    {
      onCompleted: async (data) => {
        if (data.initializeTenant.success) {
          setSuccess(true);
          await refetchUser(); // Refresh user data to update roles
        } else {
          setError('Failed to initialize tenant');
        }
      },
      onError: (error) => {
        setError(error.message || 'An error occurred');
      }
    }
  );

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refetch();
    }
  }, [isAuthenticated, authLoading, refetch]);

  const handleInitializeTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantName.trim()) {
      setError('Tenant name is required');
      return;
    }

    setError(null);

    try {
      await initializeTenant({
        variables: { tenantName: tenantName }
      });
    } catch (error) {
      // Error handling is done in the onError callback
    }
  };

  if (isLoading || authLoading) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center">Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Please sign in to access this feature.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => login()}>
            Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isInitialized) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Tenant Initialized</CardTitle>
          <CardDescription>
            Your tenant has been successfully initialized.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/dashboard" className="w-full">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }
  if (!isInitialized && called) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Initialize Your Tenant</CardTitle>
          <CardDescription>
            To get started, please initialize your tenant with a name.
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
                Tenant initialized successfully.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleInitializeTenant}>
            <div className="space-y-4">
              <Input
                placeholder="Tenant Name"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={isSubmitting}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Initializing...' : 'Initialize'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Tenant Initialization</CardTitle>
        <CardDescription>
          Please initialize your tenant to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Loading initialization status...</p>
      </CardContent>
    </Card>
  );
}
