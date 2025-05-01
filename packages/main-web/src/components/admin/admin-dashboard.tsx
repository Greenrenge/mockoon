'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GET_ADMINS } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import { AdminInvite } from './admin-invite';
import { AdminList } from './admin-list';
import { TeamManagement } from './team-management';

export function AdminDashboard() {
  // Using Apollo's useQuery hook instead of manual fetching
  const {
    data,
    loading: isLoading,
    refetch
  } = useQuery(GET_ADMINS, {
    fetchPolicy: 'network-only' // Don't use cache
  });

  const admins = data?.getAdmins || [];

  // Function to refetch admins data
  const fetchAdmins = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  return (
    <Tabs defaultValue="admins">
      <TabsList className="mb-6">
        <TabsTrigger value="admins">Admin Users</TabsTrigger>
        <TabsTrigger value="teams">Team Management</TabsTrigger>
      </TabsList>

      <TabsContent value="admins" className="space-y-6">
        <AdminInvite onSuccess={fetchAdmins} />
        <AdminList admins={admins} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="teams">
        <TeamManagement />
      </TabsContent>
    </Tabs>
  );
}
