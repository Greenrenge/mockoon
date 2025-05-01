"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useGraphQL } from "../graphql/graphql-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Trash2, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Team = {
  id: string
  name: string
  memberCount: number
}

export function TeamManagement() {
  const { query, mutation } = useGraphQL()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [teamName, setTeamName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchTeams = async () => {
    try {
      setIsLoading(true)
      const data = await query<{ teams: Team[] }>(
        `query { 
          teams { 
            id 
            name 
            memberCount 
          } 
        }`,
      )
      setTeams(data.teams)
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [query])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!teamName.trim()) {
      setError("Team name is required")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const data = await mutation<{ createTeam: { success: boolean } }>(
        `mutation($name: String!) { 
          createTeam(name: $name) { 
            success 
          } 
        }`,
        { name: teamName },
      )

      if (data.createTeam.success) {
        setSuccess(true)
        setTeamName("")
        fetchTeams()
      } else {
        setError("Failed to create team")
      }
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const data = await mutation<{ deleteTeam: { success: boolean } }>(
        `mutation($id: ID!) { 
          deleteTeam(id: $id) { 
            success 
          } 
        }`,
        { id: teamId },
      )

      if (data.deleteTeam.success) {
        fetchTeams()
      }
    } catch (error) {
      console.error("Error deleting team:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Team</CardTitle>
          <CardDescription>Create a new team for your organization</CardDescription>
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
              <AlertDescription>Team created successfully!</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateTeam}>
            <div className="flex gap-2">
              <Input
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Teams</h2>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    No teams found
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>{team.memberCount} members</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Team</DialogTitle>
                              <DialogDescription>Update the team name or manage team settings</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Input defaultValue={team.name} />
                            </div>
                            <DialogFooter>
                              <Button>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteTeam(team.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
