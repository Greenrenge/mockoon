"use client"

import { useState, useEffect } from "react"
import { useGraphQL } from "../graphql/graphql-provider"
import { useUser } from "../providers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeamMemberList } from "./team-member-list"
import { TeamMemberInvite } from "./team-member-invite"

export function TeamDashboard() {
  const { query } = useGraphQL()
  const { roles } = useUser()

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const ownedTeams = roles.teams.filter((team) => team.role === "OWNER")

  useEffect(() => {
    if (ownedTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(ownedTeams[0].id)
    }
  }, [ownedTeams, selectedTeamId])

  const fetchTeamMembers = async () => {
    if (!selectedTeamId) return

    try {
      setIsLoading(true)
      const data = await query<{ teamMembers: any[] }>(
        `query($teamId: ID!) { 
          teamMembers(teamId: $teamId) { 
            id 
            email 
            role 
            joinedAt 
          } 
        }`,
        { teamId: selectedTeamId },
      )
      setTeamMembers(data.teamMembers)
    } catch (error) {
      console.error("Error fetching team members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamMembers()
    }
  }, [selectedTeamId, query])

  return (
    <div className="space-y-6">
      {ownedTeams.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="team-select" className="text-sm font-medium">
            Select Team:
          </label>
          <Select value={selectedTeamId || ""} onValueChange={(value) => setSelectedTeamId(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {ownedTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedTeamId && (
        <Tabs defaultValue="members">
          <TabsList className="mb-6">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="settings">Team Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <TeamMemberInvite teamId={selectedTeamId} onSuccess={fetchTeamMembers} />
            <TeamMemberList
              teamId={selectedTeamId}
              members={teamMembers}
              isLoading={isLoading}
              onMemberUpdated={fetchTeamMembers}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="border rounded-md p-6">
              <h3 className="text-lg font-medium mb-4">Team Settings</h3>
              <p className="text-muted-foreground">Team settings management will be implemented in a future update.</p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
