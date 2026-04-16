import { useEffect, useState } from "react"
import apiClient from "@/lib/apiClient"
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
import { Eye, EyeOff } from "lucide-react"

export default function Settings() {
  const [fullName, setFullName] = useState("")
  const [location, setLocation] = useState("")
  const [preferredLlm, setPreferredLlm] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data } = await apiClient.get("/profile")
      setFullName(data.full_name || "")
      setLocation(data.location || "")
      setPreferredLlm(data.preferred_llm || "")
      setHasExistingKey(!!data.has_api_key)

      if (!data.location) {
        try {
          const geo = await fetch("https://ipapi.co/json/")
          const geoData = await geo.json()
          if (geoData.city && geoData.region_code) {
            setLocation(`${geoData.city}, ${geoData.region_code}`)
          }
        } catch {
          // IP geolocation failed silently
        }
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load profile" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

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
      setMessage({ type: "success", text: "Settings saved successfully" })

      if (apiKey.trim()) {
        setHasExistingKey(true)
        setApiKey("")
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
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
                onValueChange={setPreferredLlm}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? "••••••••" : "Enter your API key"}
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
              <p className="text-xs text-muted-foreground">
                Your key is encrypted and never exposed after saving
              </p>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Settings"}
            </Button>

            {message && (
              <p
                className={`text-sm text-center ${
                  message.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {message.text}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
