import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JwksGenerator } from "@/components/jwks-generator"
import { JwtGenerator } from "@/components/jwt-generator"
import { TokenList } from "@/components/token-list"
import { JwksManager } from "@/components/jwks-manager"
import { Navbar } from "@/components/navbar"

export default function Home() {
  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">JWT & JWKS Generator Tool</h1>
          <p className="text-muted-foreground">Generate and manage JSON Web Tokens and Key Sets</p>
        </div>

        <Tabs defaultValue="jwks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jwks">JWKS Generator</TabsTrigger>
            <TabsTrigger value="jwt">JWT Generator</TabsTrigger>
          </TabsList>
          <TabsContent value="jwks" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <JwksGenerator />
              <JwksManager />
            </div>
          </TabsContent>
          <TabsContent value="jwt" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <JwtGenerator />
              <TokenList />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
