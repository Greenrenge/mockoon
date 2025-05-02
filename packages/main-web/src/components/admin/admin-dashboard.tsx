'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { REMOVE_ADMIN } from '@/graphql/mutations';
import { GET_ADMINS } from '@/graphql/queries';
import { useMutation, useQuery } from '@apollo/client';
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

  // Add remove admin mutation
  const [removeAdmin, { loading: isRemoving }] = useMutation(REMOVE_ADMIN);

  const admins = data?.getAdmins || [];

  // Function to refetch admins data
  const fetchAdmins = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  // Handle admin deletion
  const handleDeleteAdmin = async (email: string) => {
    // Find the admin we're trying to delete
    const adminToDelete = admins.find((admin) => admin.email === email);

    if (!adminToDelete) {
      alert('Admin not found.');
      return;
    }

    // Check if this admin has joined (is active)
    const isJoinedAdmin = adminToDelete.joinedAt != null;

    // Count the number of joined (active) admins
    const joinedAdminsCount = admins.filter(
      (admin) => admin.joinedAt != null
    ).length;

    // If we're trying to delete the last joined admin, prevent deletion
    if (isJoinedAdmin && joinedAdminsCount <= 1) {
      alert(
        'Cannot delete the last active admin. Please ensure another admin has joined before removing this user.'
      );
      return;
    }

    // Ask for confirmation before removing an admin
    if (window.confirm(`Are you sure you want to remove ${email} as admin?`)) {
      try {
        const { data } = await removeAdmin({
          variables: { email }
        });

        if (data?.removeAdmin?.success) {
          alert(`${email} has been removed from admin users.`);
          // Refetch the admins list to update UI
          await fetchAdmins();
        } else {
          alert(
            `Failed to remove admin: ${data?.removeAdmin?.message || 'An error occurred'}`
          );
        }
      } catch (error) {
        console.error('Error removing admin:', error);
        alert('An error occurred while removing the admin user.');
      }
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
        <AdminList
          admins={admins}
          isLoading={isLoading}
          onDelete={handleDeleteAdmin}
        />
      </TabsContent>

      <TabsContent value="teams">
        <TeamManagement />
      </TabsContent>
    </Tabs>
  );
}
