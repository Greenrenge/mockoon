import { TeamDashboard } from "@/components/team/team-dashboard"
import { TeamOwnerGuard } from "@/components/guards/team-owner-guard"

export default function TeamPage() {
  return (
    <TeamOwnerGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Team Management</h1>
        <TeamDashboard />
      </div>
    </TeamOwnerGuard>
  )
}
