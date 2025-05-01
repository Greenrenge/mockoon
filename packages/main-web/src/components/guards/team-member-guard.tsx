"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../auth/auth-provider"
import { useUser } from "../providers"

export function TeamMemberGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { roles, isLoading: userLoading } = useUser()

  const isLoading = authLoading || userLoading

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/")
      } else if (!roles.isTeamMember) {
        router.push("/")
      }
    }
  }, [isAuthenticated, roles.isTeamMember, isLoading, router])

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!isAuthenticated || !roles.isTeamMember) {
    return null
  }

  return <>{children}</>
}
