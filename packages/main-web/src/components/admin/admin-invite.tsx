"use client"

import type React from "react"

import { useState } from "react"
import { useGraphQL } from "../graphql/graphql-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

type AdminInviteProps = {
  onSuccess: () => void
}

export function AdminInvite({ onSuccess }: AdminInviteProps) {
  const { mutation } = useGraphQL()
  const [email, setEmail] = useState("")
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

      const data = await mutation<{ inviteAdmin: { success: boolean } }>(
        `mutation($email: String!) { 
          inviteAdmin(email: $email) { 
            success 
          } 
        }`,
        { email },
      )

      if (data.inviteAdmin.success) {
        setSuccess(true)
        setEmail("")
        onSuccess()
      } else {
        setError("Failed to invite admin")
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
        <CardTitle>Invite Admin</CardTitle>
        <CardDescription>Invite a new admin user by email</CardDescription>
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
            <AlertDescription>Admin invitation sent successfully!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleInvite}>
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Invite"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
