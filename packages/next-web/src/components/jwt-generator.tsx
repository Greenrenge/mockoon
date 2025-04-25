"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Copy, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

type PayloadField = {
  key: string
  type: "string" | "number" | "boolean" | "date" | "json"
  value: string
}

type SavedToken = {
  id: string
  token: string
  remark: string
  createdAt: string
}

export function JwtGenerator() {
  const { toast } = useToast()
  const [keySource, setKeySource] = useState<"generated" | "manual">("generated")
  const [privateKey, setPrivateKey] = useState<string>("")
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState<string>("")
  const [payloadFields, setPayloadFields] = useState<PayloadField[]>([
    { key: "sub", type: "string", value: "" },
    { key: "iat", type: "number", value: Math.floor(Date.now() / 1000).toString() },
    { key: "exp", type: "number", value: (Math.floor(Date.now() / 1000) + 3600).toString() },
  ])
  const [token, setToken] = useState<string>("")
  const [remark, setRemark] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  useEffect(() => {
    // Load generated key if available
    const storedKey = localStorage.getItem("jwks_private_key")
    if (storedKey) {
      setGeneratedPrivateKey(storedKey)
    }
  }, [])

  const addPayloadField = () => {
    setPayloadFields([...payloadFields, { key: "", type: "string", value: "" }])
  }

  const removePayloadField = (index: number) => {
    const newFields = [...payloadFields]
    newFields.splice(index, 1)
    setPayloadFields(newFields)
  }

  const updatePayloadField = (index: number, field: Partial<PayloadField>) => {
    const newFields = [...payloadFields]
    newFields[index] = { ...newFields[index], ...field }
    setPayloadFields(newFields)
  }

  const generateToken = () => {
    setIsGenerating(true)

    try {
      // Build payload from fields
      const payload: Record<string, any> = {}

      for (const field of payloadFields) {
        if (!field.key.trim()) continue

        switch (field.type) {
          case "number":
            payload[field.key] = Number(field.value)
            break
          case "boolean":
            payload[field.key] = field.value === "true"
            break
          case "date":
            payload[field.key] = new Date(field.value).toISOString()
            break
          case "json":
            try {
              payload[field.key] = JSON.parse(field.value)
            } catch (e) {
              payload[field.key] = field.value
            }
            break
          default:
            payload[field.key] = field.value
        }
      }

      // In a real implementation, we would use the jose library to sign the JWT
      // For this demo, we'll simulate JWT generation
      setTimeout(() => {
        // Create a mock JWT
        const header = {
          alg: "RS256",
          typ: "JWT",
          kid: "mock-key-id",
        }

        const encodedHeader = btoa(JSON.stringify(header))
        const encodedPayload = btoa(JSON.stringify(payload))
        const mockSignature = "mockSignature123456789"

        const jwt = `${encodedHeader}.${encodedPayload}.${mockSignature}`

        setToken(jwt)
        setIsGenerating(false)

        toast({
          title: "JWT Generated",
          description: "Your JWT has been successfully generated.",
        })
      }, 1000)
    } catch (error) {
      toast({
        title: "Error Generating JWT",
        description: "There was an error generating your JWT. Please check your inputs.",
        variant: "destructive",
      })
      setIsGenerating(false)
    }
  }

  const saveToken = () => {
    if (!token) return

    try {
      // Get existing tokens
      const existingTokensJson = localStorage.getItem("saved_tokens")
      const existingTokens: SavedToken[] = existingTokensJson ? JSON.parse(existingTokensJson) : []

      // Add new token
      const newToken: SavedToken = {
        id: Date.now().toString(),
        token,
        remark: remark || "Untitled Token",
        createdAt: new Date().toISOString(),
      }

      const updatedTokens = [newToken, ...existingTokens]

      // Save to localStorage
      localStorage.setItem("saved_tokens", JSON.stringify(updatedTokens))

      toast({
        title: "Token Saved",
        description: "Your JWT has been saved to your token list.",
      })

      // Reset remark
      setRemark("")

      // Trigger a custom event to notify the token list component
      window.dispatchEvent(new Event("tokensUpdated"))
    } catch (error) {
      toast({
        title: "Error Saving Token",
        description: "There was an error saving your token.",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to Clipboard",
      description: "JWT has been copied to your clipboard.",
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate JSON Web Token (JWT)</CardTitle>
        <CardDescription>Create a JWT using a private key and custom payload</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={keySource} onValueChange={(v) => setKeySource(v as "generated" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generated">Use Generated Key</TabsTrigger>
            <TabsTrigger value="manual">Manual Key Input</TabsTrigger>
          </TabsList>
          <TabsContent value="generated" className="space-y-4 pt-4">
            {generatedPrivateKey ? (
              <div className="space-y-2">
                <Label>Using Generated Private Key</Label>
                <div className="bg-muted p-2 rounded-md text-xs font-mono truncate">
                  {generatedPrivateKey.substring(0, 50)}...
                </div>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md text-center">
                <p className="text-muted-foreground">
                  No generated key found. Please generate a key in the JWKS Generator tab.
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="private-key-input">Private Key (JWK format)</Label>
              <Textarea
                id="private-key-input"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Paste your private key in JWK format"
                className="font-mono text-xs h-32"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>JWT Payload</Label>
            <Button variant="outline" size="sm" onClick={addPayloadField}>
              <Plus className="h-4 w-4 mr-2" /> Add Field
            </Button>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {payloadFields.map((field, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-3">
                    <Input
                      value={field.key}
                      onChange={(e) => updatePayloadField(index, { key: e.target.value })}
                      placeholder="Key"
                    />
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={field.type}
                      onValueChange={(value) => updatePayloadField(index, { type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5">
                    {field.type === "boolean" ? (
                      <Select value={field.value} onValueChange={(value) => updatePayloadField(index, { value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Value" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">true</SelectItem>
                          <SelectItem value="false">false</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : field.type === "date" ? (
                      <Input
                        type="datetime-local"
                        value={field.value}
                        onChange={(e) => updatePayloadField(index, { value: e.target.value })}
                      />
                    ) : (
                      <Input
                        value={field.value}
                        onChange={(e) => updatePayloadField(index, { value: e.target.value })}
                        placeholder="Value"
                      />
                    )}
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayloadField(index)}
                      disabled={payloadFields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Button
          onClick={generateToken}
          disabled={
            isGenerating ||
            (keySource === "generated" && !generatedPrivateKey) ||
            (keySource === "manual" && !privateKey)
          }
          className="w-full"
        >
          {isGenerating ? "Generating..." : "Generate JWT"}
        </Button>

        {token && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="generated-token">Generated JWT</Label>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(token)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <Textarea id="generated-token" value={token} readOnly className="font-mono text-xs h-24 break-all" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-remark">Token Remark</Label>
              <Input
                id="token-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add a description for this token"
              />
            </div>

            <Button onClick={saveToken} variant="outline" className="w-full">
              <Save className="h-4 w-4 mr-2" /> Save Token
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
