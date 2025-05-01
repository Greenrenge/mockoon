"use client"

import { useGraphQL } from "../graphql/graphql-provider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import { Trash2 } from "lucide-react"

type TeamMember = {
  id: string
  email: string
  role: string
  joinedAt: string | null
}

type TeamMemberListProps = {
  teamId: string
  members: TeamMember[]
  isLoading: boolean
  onMemberUpdated: () => void
}

export function TeamMemberList({ teamId, members, isLoading, onMemberUpdated }: TeamMemberListProps) {
  const { mutation } = useGraphQL()

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      const data = await mutation<{ updateTeamMemberRole: { success: boolean } }>(
        `mutation($teamId: ID!, $memberId: ID!, $role: String!) { 
          updateTeamMemberRole(teamId: $teamId, memberId: $memberId, role: $role) { 
            success 
          } 
        }`,
        { teamId, memberId, role },
      )

      if (data.updateTeamMemberRole.success) {
        onMemberUpdated()
      }
    } catch (error) {
      console.error("Error updating role:", error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const data = await mutation<{ removeTeamMember: { success: boolean } }>(
        `mutation($teamId: ID!, $memberId: ID!) { 
          removeTeamMember(teamId: $teamId, memberId: $memberId) { 
            success 
          } 
        }`,
        { teamId, memberId },
      )

      if (data.removeTeamMember.success) {
        onMemberUpdated()
      }
    } catch (error) {
      console.error("Error removing member:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="border rounded-md">
          <div className="h-10 border-b bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border-b last:border-0 px-4 py-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Team Members</h2>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No team members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Select value={member.role} onValueChange={(value) => handleRoleChange(member.id, value)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {member.joinedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Invited
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{member.joinedAt ? formatDate(member.joinedAt) : "Not joined yet"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="icon" onClick={() => handleRemoveMember(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
