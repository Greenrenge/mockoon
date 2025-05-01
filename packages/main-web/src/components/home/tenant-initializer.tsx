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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-provider';
import { useGraphQL } from '../graphql/graphql-provider';
import { useUser } from '../providers';

export function TenantInitializer() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { query, mutation } = useGraphQL();
  const { refetchUser } = useUser();

  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkInitialization = async () => {
      if (!isAuthenticated || authLoading) {
        return;
      }

      try {
        setIsLoading(true);
        const data = await query<{
          initializationStatus: { initialized: boolean };
        }>(`query { initializationStatus { initialized } }`);
        setIsInitialized(data.initializationStatus.initialized);
      } catch (error) {
        console.error('Error checking initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialization();
  }, [isAuthenticated, authLoading, query]);

  const handleInitializeTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantName.trim()) {
      setError('Tenant name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const data = await mutation<{ initializeTenant: { success: boolean } }>(
        `mutation($name: String!) { 
          initializeTenant(name: $name) { 
            success 
          } 
        }`,
        { name: tenantName }
      );

      if (data.initializeTenant.success) {
        setSuccess(true);
        setIsInitialized(true);
        await refetchUser(); // Refresh user data to update roles
      } else {
        setError('Failed to initialize tenant');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
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
          <CardTitle>Get Started</CardTitle>
          <CardDescription>
            Login to set up your PandaMock tenant
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isInitialized) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Tenant Initialized
          </CardTitle>
          <CardDescription>
            Your PandaMock tenant is ready to use
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/app">Launch App</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Initialize Your Tenant</CardTitle>
        <CardDescription>
          Set up your PandaMock tenant to get started
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
          <Alert className="mb-4 border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Your tenant has been initialized successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleInitializeTenant}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tenantName" className="text-sm font-medium">
                Tenant Name
              </label>
              <Input
                id="tenantName"
                placeholder="Enter your tenant name"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
            {isSubmitting ? 'Initializing...' : 'Initialize Tenant'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
