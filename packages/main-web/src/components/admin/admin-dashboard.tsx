"use client"

import { useState, useEffect } from "react"
import { useGraphQL } from "../graphql/graphql-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminList } from "./admin-list"
import { AdminInvite } from "./admin-invite"
import { TeamManagement } from "./team-management"

export function AdminDashboard() {
  const { query } = useGraphQL()
  const [admins, setAdmins] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAdmins = async () => {
    try {
      setIsLoading(true)
      const data = await query<{ admins: any[] }>(
        `query { 
          admins { 
            id 
            email 
            joinedAt 
          } 
        }`,
      )
      setAdmins(data.admins)
    } catch (error) {
      console.error("Error fetching admins:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [query])

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
  )
}
