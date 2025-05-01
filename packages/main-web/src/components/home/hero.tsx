"use client"

import { PiIcon as Panda } from "lucide-react"

export function HomeHero() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Panda className="h-24 w-24 mb-6" />
      <h1 className="text-4xl font-bold mb-4">Welcome to PandaMock</h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        The complete SaaS solution for your mock data needs. Set up your tenant, manage your teams, and start creating
        mock data in minutes.
      </p>
    </div>
  )
}
