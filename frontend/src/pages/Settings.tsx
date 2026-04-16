import { useEffect, useState } from "react"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye, EyeOff } from "lucide-react"

export default function Settings() {
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [preferredLlm, setPreferredLlm] = useState("")
  const [initialLlm, setInitialLlm] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyError, setApiKeyError] = useState("")
  const [llmChanged, setLlmChanged] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data } = await apiClient.get("/profile")
      setFullName(data.full_name || "")
      setLocation(data.location || "")
      setPreferredLlm(data.preferred_llm || "")
      setInitialLlm(data.preferred_llm || "")
      setHasExistingKey(!!data.has_api_key)

      if (!data.location) {
        try {
          const geo = await fetch("https://ipapi.co/json/")
          const geoData = await geo.json()
          if (geoData.city && geoData.region_code) {
            setLocation(`${geoData.city}, ${geoData.region_code}`)
          }
        } catch {
          // silent
        }
      }
    } catch {
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleLlmChange = (value: string) => {
    setPreferredLlm(value)
    setLlmChanged(value !== initialLlm)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiKeyError("")

    if (apiKey.trim() && apiKey.trim().length < 20) {
      setApiKeyError("This doesn't look like a valid API key")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, string> = {
        full_name: fullName,
        location,
        preferred_llm: preferredLlm,
      }
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim()
      }

      await apiClient.put("/profile", payload)
      toast.success("Settings updated")

      if (apiKey.trim()) {
        setHasExistingKey(true)
        setApiKey("")
      }
      setInitialLlm(preferredLlm)
      setLlmChanged(false)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your profile, default location, and LLM API key
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Base Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Chicago, IL"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Used as default on the Generate screen
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm">Preferred LLM</Label>
                <Select
                  value={preferredLlm}
                  onValueChange={handleLlmChange}
                  disabled={saving}
                >
                  <SelectTrigger id="llm">
                    <SelectValue placeholder="Select an LLM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="gpt4o">GPT-4o</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
                {llmChanged && (
                  <p className="text-xs text-amber-600">
                    Make sure your API key matches the selected provider
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setApiKeyError("")
                    }}
                    placeholder={
                      hasExistingKey ? "••••••••" : "Enter your API key"
                    }
                    disabled={saving}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {apiKeyError ? (
                  <p className="text-xs text-destructive">{apiKeyError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your key is encrypted and never exposed after saving
                  </p>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
