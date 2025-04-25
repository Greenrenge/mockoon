"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Trash2, Edit, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type SavedToken = {
  id: string
  token: string
  remark: string
  createdAt: string
}

export function TokenList() {
  const { toast } = useToast()
  const [tokens, setTokens] = useState<SavedToken[]>([])
  const [editingToken, setEditingToken] = useState<SavedToken | null>(null)
  const [editRemark, setEditRemark] = useState<string>("")
  const [showTokenDetails, setShowTokenDetails] = useState<string | null>(null)

  const loadTokens = () => {
    try {
      const tokensJson = localStorage.getItem("saved_tokens")
      if (tokensJson) {
        setTokens(JSON.parse(tokensJson))
      }
    } catch (error) {
      console.error("Error loading tokens:", error)
      setTokens([])
    }
  }

  useEffect(() => {
    loadTokens()

    // Listen for updates from the JWT generator
    window.addEventListener("tokensUpdated", loadTokens)

    return () => {
      window.removeEventListener("tokensUpdated", loadTokens)
    }
  }, [])

  const deleteToken = (id: string) => {
    try {
      const updatedTokens = tokens.filter((token) => token.id !== id)
      localStorage.setItem("saved_tokens", JSON.stringify(updatedTokens))
      setTokens(updatedTokens)

      toast({
        title: "Token Deleted",
        description: "The token has been removed from your list.",
      })
    } catch (error) {
      toast({
        title: "Error Deleting Token",
        description: "There was an error deleting the token.",
        variant: "destructive",
      })
    }
  }

  const startEditToken = (token: SavedToken) => {
    setEditingToken(token)
    setEditRemark(token.remark)
  }

  const saveEditToken = () => {
    if (!editingToken) return

    try {
      const updatedTokens = tokens.map((token) =>
        token.id === editingToken.id ? { ...token, remark: editRemark } : token,
      )

      localStorage.setItem("saved_tokens", JSON.stringify(updatedTokens))
      setTokens(updatedTokens)
      setEditingToken(null)

      toast({
        title: "Token Updated",
        description: "The token remark has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error Updating Token",
        description: "There was an error updating the token.",
        variant: "destructive",
      })
    }
  }

  const cancelEditToken = () => {
    setEditingToken(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to Clipboard",
      description: "JWT has been copied to your clipboard.",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const toggleTokenDetails = (id: string) => {
    setShowTokenDetails(showTokenDetails === id ? null : id)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Saved Tokens</CardTitle>
        <CardDescription>Manage your generated JWTs</CardDescription>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No saved tokens yet.</p>
            <p className="text-sm">Generate and save a token to see it here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {tokens.map((token) => (
                <Card key={token.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        {editingToken?.id === token.id ? (
                          <Input
                            value={editRemark}
                            onChange={(e) => setEditRemark(e.target.value)}
                            className="font-medium"
                          />
                        ) : (
                          <h4 className="font-medium">{token.remark}</h4>
                        )}
                        <p className="text-xs text-muted-foreground">Created: {formatDate(token.createdAt)}</p>
                      </div>
                      <div className="flex space-x-1">
                        {editingToken?.id === token.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={saveEditToken}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={cancelEditToken}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEditToken(token)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(token.token)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteToken(token.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs w-full justify-start font-mono truncate"
                        onClick={() => toggleTokenDetails(token.id)}
                      >
                        {token.token.substring(0, 40)}...
                      </Button>

                      {showTokenDetails === token.id && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full mt-2">
                              View Token Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>{token.remark}</DialogTitle>
                              <DialogDescription>Created on {formatDate(token.createdAt)}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>JWT Token</Label>
                                <Textarea value={token.token} readOnly className="font-mono text-xs h-24 break-all" />
                              </div>

                              <div className="space-y-2">
                                <Label>Decoded Header</Label>
                                <Textarea
                                  value={(() => {
                                    try {
                                      const parts = token.token.split(".")
                                      return JSON.stringify(JSON.parse(atob(parts[0])), null, 2)
                                    } catch (e) {
                                      return "Unable to decode header"
                                    }
                                  })()}
                                  readOnly
                                  className="font-mono text-xs h-24"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Decoded Payload</Label>
                                <Textarea
                                  value={(() => {
                                    try {
                                      const parts = token.token.split(".")
                                      return JSON.stringify(JSON.parse(atob(parts[1])), null, 2)
                                    } catch (e) {
                                      return "Unable to decode payload"
                                    }
                                  })()}
                                  readOnly
                                  className="font-mono text-xs h-24"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="secondary" onClick={() => copyToClipboard(token.token)}>
                                <Copy className="h-4 w-4 mr-2" /> Copy Token
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
