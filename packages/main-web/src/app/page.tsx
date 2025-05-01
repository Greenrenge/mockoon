import { HomeHero } from "@/components/home/hero"
import { TenantInitializer } from "@/components/home/tenant-initializer"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <HomeHero />
      <TenantInitializer />
    </div>
  )
}
