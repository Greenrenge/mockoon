import { TeamMemberGuard } from "@/components/guards/team-member-guard"
import { AppDashboard } from "@/components/app/app-dashboard"

export default function AppPage() {
  return (
    <TeamMemberGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">PandaMock App</h1>
        <AppDashboard />
      </div>
    </TeamMemberGuard>
  )
}
