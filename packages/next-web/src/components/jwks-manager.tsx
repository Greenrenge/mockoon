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

type SavedJwks = {
  id: string
  label: string
  privateKey: string
  publicKey: string
  jwks: string
  algorithm: string
  keyId: string
  createdAt: string
}

export function JwksManager() {
  const { toast } = useToast()
  const [jwksList, setJwksList] = useState<SavedJwks[]>([])
  const [editingJwks, setEditingJwks] = useState<SavedJwks | null>(null)
  const [editLabel, setEditLabel] = useState<string>("")
  const [showJwksDetails, setShowJwksDetails] = useState<string | null>(null)

  const loadJwksList = () => {
    try {
      const jwksJson = localStorage.getItem("saved_jwks")
      if (jwksJson) {
        setJwksList(JSON.parse(jwksJson))
      }
    } catch (error) {
      console.error("Error loading JWKS:", error)
      setJwksList([])
    }
  }

  useEffect(() => {
    loadJwksList()

    // Listen for updates from the JWKS generator
    window.addEventListener("jwksUpdated", loadJwksList)

    return () => {
      window.removeEventListener("jwksUpdated", loadJwksList)
    }
  }, [])

  const deleteJwks = (id: string) => {
    try {
      const updatedJwksList = jwksList.filter((jwks) => jwks.id !== id)
      localStorage.setItem("saved_jwks", JSON.stringify(updatedJwksList))
      setJwksList(updatedJwksList)

      toast({
        title: "JWKS Deleted",
        description: "The JWKS has been removed from your list.",
      })
    } catch (error) {
      toast({
        title: "Error Deleting JWKS",
        description: "There was an error deleting the JWKS.",
        variant: "destructive",
      })
    }
  }

  const startEditJwks = (jwks: SavedJwks) => {
    setEditingJwks(jwks)
    setEditLabel(jwks.label)
  }

  const saveEditJwks = () => {
    if (!editingJwks) return

    try {
      const updatedJwksList = jwksList.map((jwks) =>
        jwks.id === editingJwks.id ? { ...jwks, label: editLabel } : jwks,
      )

      localStorage.setItem("saved_jwks", JSON.stringify(updatedJwksList))
      setJwksList(updatedJwksList)
      setEditingJwks(null)

      toast({
        title: "JWKS Updated",
        description: "The JWKS label has been updated.",
      })
    } catch (error) {
      toast({
        title: "Error Updating JWKS",
        description: "There was an error updating the JWKS.",
        variant: "destructive",
      })
    }
  }

  const cancelEditJwks = () => {
    setEditingJwks(null)
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to Clipboard",
      description: `${type} has been copied to your clipboard.`,
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const toggleJwksDetails = (id: string) => {
    setShowJwksDetails(showJwksDetails === id ? null : id)
  }

  const selectJwksForGenerator = (jwks: SavedJwks) => {
    localStorage.setItem("selected_jwks", JSON.stringify(jwks))
    toast({
      title: "JWKS Selected",
      description: "This JWKS will be used for JWT generation.",
    })
    window.dispatchEvent(new Event("jwksSelected"))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Saved JWKS</CardTitle>
        <CardDescription>Manage your generated JSON Web Key Sets</CardDescription>
      </CardHeader>
      <CardContent>
        {jwksList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No saved JWKS yet.</p>
            <p className="text-sm">Generate and save a JWKS to see it here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {jwksList.map((jwks) => (
                <Card key={jwks.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        {editingJwks?.id === jwks.id ? (
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="font-medium"
                          />
                        ) : (
                          <h4 className="font-medium">{jwks.label}</h4>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Algorithm: {jwks.algorithm} | Key ID: {jwks.keyId}
                        </p>
                        <p className="text-xs text-muted-foreground">Created: {formatDate(jwks.createdAt)}</p>
                      </div>
                      <div className="flex space-x-1">
                        {editingJwks?.id === jwks.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={saveEditJwks}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={cancelEditJwks}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEditJwks(jwks)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteJwks(jwks.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => toggleJwksDetails(jwks.id)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs"
                        onClick={() => selectJwksForGenerator(jwks)}
                      >
                        Use for JWT
                      </Button>
                    </div>

                    {showJwksDetails === jwks.id && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mt-2">
                            View JWKS Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{jwks.label}</DialogTitle>
                            <DialogDescription>
                              Algorithm: {jwks.algorithm} | Created on {formatDate(jwks.createdAt)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Private Key (JWK)</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(jwks.privateKey, "Private Key")}
                                >
                                  <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                              </div>
                              <Textarea value={jwks.privateKey} readOnly className="font-mono text-xs h-24" />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Public Key (JWK)</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(jwks.publicKey, "Public Key")}
                                >
                                  <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                              </div>
                              <Textarea value={jwks.publicKey} readOnly className="font-mono text-xs h-24" />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>JWKS</Label>
                                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(jwks.jwks, "JWKS")}>
                                  <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                              </div>
                              <Textarea value={jwks.jwks} readOnly className="font-mono text-xs h-24" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => selectJwksForGenerator(jwks)}>Use for JWT Generation</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
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
