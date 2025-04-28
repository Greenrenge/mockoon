"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Copy, Save } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export function JwksGenerator() {
  const { toast } = useToast()
  const [algorithm, setAlgorithm] = useState<string>("RS256")
  const [keyId, setKeyId] = useState<string>(`key-${Math.floor(Math.random() * 1000)}`)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [keyPair, setKeyPair] = useState<{
    privateKey: string
    publicKey: string
    jwks: string
  } | null>(null)
  const [jwksLabel, setJwksLabel] = useState<string>(`JWKS-${Math.floor(Math.random() * 1000)}`)

  const generateKeyPair = async () => {
    setIsGenerating(true)
    try {
      // In a real implementation, we would use the jose library
      // For this demo, we'll simulate the key generation
      setTimeout(() => {
        // Simulate key generation
        const mockPrivateKey = {
          kty: "RSA",
          kid: keyId,
          use: "sig",
          alg: algorithm,
          n: "mockBase64Value",
          e: "AQAB",
          d: "mockPrivateKeyComponent",
          p: "mockPrimeP",
          q: "mockPrimeQ",
          dp: "mockDp",
          dq: "mockDq",
          qi: "mockQi",
        }

        const mockPublicKey = {
          kty: "RSA",
          kid: keyId,
          use: "sig",
          alg: algorithm,
          n: "mockBase64Value",
          e: "AQAB",
        }

        const mockJwks = {
          keys: [mockPublicKey],
        }

        setKeyPair({
          privateKey: JSON.stringify(mockPrivateKey, null, 2),
          publicKey: JSON.stringify(mockPublicKey, null, 2),
          jwks: JSON.stringify(mockJwks, null, 2),
        })

        // Store in localStorage for JWT generation
        localStorage.setItem("jwks_private_key", JSON.stringify(mockPrivateKey))
        localStorage.setItem("jwks_public_key", JSON.stringify(mockPublicKey))

        toast({
          title: "Keys Generated Successfully",
          description: "Your JWKS and key pair have been generated.",
        })

        setIsGenerating(false)
      }, 1000)
    } catch (error) {
      toast({
        title: "Error Generating Keys",
        description: "There was an error generating your keys. Please try again.",
        variant: "destructive",
      })
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to Clipboard",
      description: `${label} has been copied to your clipboard.`,
    })
  }

  const saveJwks = () => {
    if (!keyPair) return

    try {
      // Get existing JWKS
      const existingJwksJson = localStorage.getItem("saved_jwks")
      const existingJwks: any[] = existingJwksJson ? JSON.parse(existingJwksJson) : []

      // Add new JWKS
      const newJwks = {
        id: Date.now().toString(),
        label: jwksLabel,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        jwks: keyPair.jwks,
        algorithm,
        keyId,
        createdAt: new Date().toISOString(),
      }

      const updatedJwks = [newJwks, ...existingJwks]

      // Save to localStorage
      localStorage.setItem("saved_jwks", JSON.stringify(updatedJwks))

      toast({
        title: "JWKS Saved",
        description: "Your JWKS has been saved to your list.",
      })

      // Reset label
      setJwksLabel(`JWKS-${Math.floor(Math.random() * 1000)}`)

      // Trigger a custom event to notify the JWKS manager component
      window.dispatchEvent(new Event("jwksUpdated"))
    } catch (error) {
      toast({
        title: "Error Saving JWKS",
        description: "There was an error saving your JWKS.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate JSON Web Key Set (JWKS)</CardTitle>
        <CardDescription>Create a new key pair for signing and verifying JWTs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="algorithm">Signing Algorithm</Label>
            <Select value={algorithm} onValueChange={setAlgorithm}>
              <SelectTrigger id="algorithm">
                <SelectValue placeholder="Select algorithm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RS256">RS256 (RSA + SHA-256)</SelectItem>
                <SelectItem value="ES256">ES256 (ECDSA + P-256 + SHA-256)</SelectItem>
                <SelectItem value="HS256">HS256 (HMAC + SHA-256)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="key-id">Key ID (kid)</Label>
            <Input
              id="key-id"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="Enter a unique key identifier"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jwks-label">JWKS Label</Label>
            <Input
              id="jwks-label"
              value={jwksLabel}
              onChange={(e) => setJwksLabel(e.target.value)}
              placeholder="Enter a label for this JWKS"
            />
          </div>
        </div>

        <Button onClick={generateKeyPair} disabled={isGenerating} className="w-full">
          {isGenerating ? "Generating..." : "Generate Key Pair"}
        </Button>

        {keyPair && (
          <div className="space-y-4 mt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Keep your private key secure. Anyone with access to your private key can create valid JWTs.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="private-key">Private Key (JWK)</Label>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(keyPair.privateKey, "Private Key")}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <Textarea id="private-key" value={keyPair.privateKey} readOnly className="font-mono text-xs h-40" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="public-key">Public Key (JWK)</Label>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(keyPair.publicKey, "Public Key")}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <Textarea id="public-key" value={keyPair.publicKey} readOnly className="font-mono text-xs h-32" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="jwks">JWKS (JSON Web Key Set)</Label>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(keyPair.jwks, "JWKS")}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <Textarea id="jwks" value={keyPair.jwks} readOnly className="font-mono text-xs h-32" />
            </div>

            <Button onClick={saveJwks} variant="outline" className="w-full">
              <Save className="h-4 w-4 mr-2" /> Save JWKS
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
