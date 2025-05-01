"use client"

import type React from "react"

import { useState } from "react"
import { useGraphQL } from "../graphql/graphql-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TeamMemberInviteProps = {
  teamId: string
  onSuccess: () => void
}

export function TeamMemberInvite({ teamId, onSuccess }: TeamMemberInviteProps) {
  const { mutation } = useGraphQL()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("USER")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const data = await mutation<{ inviteTeamMember: { success: boolean } }>(
        `mutation($email: String!, $role: String!, $teamId: ID!) { 
          inviteTeamMember(email: $email, role: $role, teamId: $teamId) { 
            success 
          } 
        }`,
        { email, role, teamId },
      )

      if (data.inviteTeamMember.success) {
        setSuccess(true)
        setEmail("")
        onSuccess()
      } else {
        setError("Failed to invite team member")
      }
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
        <CardDescription>Invite a new member to your team</CardDescription>
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
            <AlertDescription>Team member invitation sent successfully!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Invite Member"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
