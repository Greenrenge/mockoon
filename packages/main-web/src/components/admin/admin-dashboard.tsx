'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { REMOVE_ADMIN } from '@/graphql/mutations';
import { GET_ADMINS } from '@/graphql/queries';
import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { toast } from 'sonner';
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

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [adminToDeleteEmail, setAdminToDeleteEmail] = useState<string | null>(
    null
  );

  const admins = data?.getAdmins || [];

  // Function to refetch admins data
  const fetchAdmins = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  // Function to actually perform the deletion after confirmation
  const confirmDeleteAdmin = async () => {
    if (!adminToDeleteEmail) return;

    try {
      const { data } = await removeAdmin({
        variables: { email: adminToDeleteEmail }
      });

      if (data?.removeAdmin?.success) {
        toast.success(
          `${adminToDeleteEmail} has been removed from admin users.`
        );
        await fetchAdmins(); // Refetch the admins list to update UI
      } else {
        toast.error(
          `Failed to remove admin: ${data?.removeAdmin?.message || 'An error occurred'}`
        );
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('An error occurred while removing the admin user.');
    } finally {
      // Close the dialog and reset state
      setIsConfirmDialogOpen(false);
      setAdminToDeleteEmail(null);
    }
  };

  // Handle admin deletion - modified to open dialog
  const handleDeleteAdmin = async (email: string) => {
    // Find the admin we're trying to delete
    const adminToDelete = admins.find((admin) => admin.email === email);

    if (!adminToDelete) {
      toast.error('Admin not found.');
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
      toast.error(
        'Cannot delete the last active admin. Please ensure another admin has joined before removing this user.'
      );
      return;
    }

    // Set state to open the confirmation dialog
    setAdminToDeleteEmail(email);
    setIsConfirmDialogOpen(true);
  };

  return (
    <>
      {' '}
      {/* Use Fragment to wrap multiple top-level elements */}
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
            onDelete={handleDeleteAdmin} // Pass the modified handler
          />
        </TabsContent>

        <TabsContent value="teams">
          <TeamManagement />
        </TabsContent>
      </Tabs>
      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently remove{' '}
              <strong>{adminToDeleteEmail}</strong> as an admin user.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setAdminToDeleteEmail(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAdmin}
              className="text-white"
              disabled={isRemoving}
            >
              Confirm Removal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
