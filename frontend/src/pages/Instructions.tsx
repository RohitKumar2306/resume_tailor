import { useEffect, useState } from "react"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const MAX_CHARS = 5000

const PLACEHOLDER = `Enter your resume rules here. For example:
- Bullets must be 20-25 words
- Bold all metrics and technologies
- One page, no columns
- Always include a professional summary
- Use strong action verbs`

export default function Instructions() {
  const [ruleText, setRuleText] = useState("")
  const [savedText, setSavedText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      toast.error("Failed to load instructions")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await apiClient.put("/instructions", {
        rule_text: ruleText,
      })
      const text = data.rule_text || ""
      setSavedText(text)
      setRuleText(text)
      toast.success("Instructions saved")
    } catch {
      toast.error("Failed to save instructions")
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = ruleText !== savedText

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
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-3 w-20 ml-auto" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <textarea
                  id="instructions"
                  value={ruleText}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) {
                      setRuleText(e.target.value)
                    }
                  }}
                  placeholder={PLACEHOLDER}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
