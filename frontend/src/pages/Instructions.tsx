import { useEffect, useState, useRef } from "react"
import apiClient from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

const MAX_CHARS = 5000

export default function Instructions() {
  const [ruleText, setRuleText] = useState("")
  const [savedText, setSavedText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadInstructions()
  }, [])

  const loadInstructions = async () => {
    try {
      const { data } = await apiClient.get("/instructions")
      const text = data.rule_text || ""
      setRuleText(text)
      setSavedText(text)
    } catch {
      setMessage({ type: "error", text: "Failed to load instructions" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data } = await apiClient.put("/instructions", {
        rule_text: ruleText,
      })
      const text = data.rule_text || ""
      setSavedText(text)
      setRuleText(text)
      setMessage({ type: "success", text: "Instructions saved" })
      setTimeout(() => setMessage(null), 3000)
    } catch {
      setMessage({ type: "error", text: "Failed to save instructions" })
      setTimeout(() => setMessage(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = ruleText !== savedText

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Loading instructions...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Custom Instructions</CardTitle>
          <CardDescription>
            These rules are applied to every resume generation automatically.
            Be specific about formatting preferences, sections to include or
            exclude, tone, and any other constraints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <textarea
              ref={textareaRef}
              id="instructions"
              value={ruleText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setRuleText(e.target.value)
                }
              }}
              placeholder="Example: Always include a professional summary. Use action verbs. Keep to one page. Don't include references..."
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              style={{ minHeight: "300px" }}
            />
            <p className="text-xs text-muted-foreground text-right">
              {ruleText.length} / {MAX_CHARS}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full"
          >
            {saving ? "Saving..." : "Save Instructions"}
          </Button>

          {message && (
            <div
              className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
