"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type AuthConfig = {
  type: "disabled" | "keycloak" | "supabase"
}

type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  config: AuthConfig
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  config: { type: "disabled" },
  login: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [config, setConfig] = useState<AuthConfig>({ type: "disabled" })

  useEffect(() => {
    // Fetch auth configuration
    const fetchConfig = async () => {
      try {
        // This would be replaced with an actual API call
        const response = await fetch("/api/auth/config")
        const data = await response.json()
        setConfig(data)
      } catch (error) {
        console.error("Error fetching auth config:", error)
      }
    }

    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        // This would be replaced with actual auth check
        const response = await fetch("/api/auth/session")
        const data = await response.json()

        setIsAuthenticated(data.isAuthenticated)
        setUser(data.user)
      } catch (error) {
        console.error("Error checking auth:", error)
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
    checkAuth()
  }, [])

  const login = async () => {
    setIsLoading(true)
    try {
      // This would be replaced with actual login logic based on config.type
      const response = await fetch("/api/auth/login", { method: "POST" })
      const data = await response.json()

      setIsAuthenticated(true)
      setUser(data.user)
    } catch (error) {
      console.error("Error logging in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      // This would be replaced with actual logout logic
      await fetch("/api/auth/logout", { method: "POST" })

      setIsAuthenticated(false)
      setUser(null)
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, config, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
