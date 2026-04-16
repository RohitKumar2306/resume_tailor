import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
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
import ATSScoreBadge from "@/components/ATSScoreBadge"
import { AlertTriangle, Download, RefreshCw, CheckCircle } from "lucide-react"
import type { GenerateResponse } from "@/types"

const PROGRESS_MESSAGES = [
  "Extracting keywords from job description...",
  "Searching your base resumes for best matches...",
  "Assembling tailored resume...",
  "Scoring ATS coverage...",
  "Finalizing output...",
]

export default function Generate() {
  const [location, setLocation] = useState("")
  const [jdText, setJdText] = useState("")
  const [outputFormat, setOutputFormat] = useState<"pdf" | "docx">("pdf")
  const [hasBaseResumes, setHasBaseResumes] = useState(true)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progressIdx, setProgressIdx] = useState(0)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState("")
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadInitialData()
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [])

  const loadInitialData = async () => {
    try {
      const [profileRes, docsRes] = await Promise.all([
        apiClient.get("/profile"),
        apiClient.get("/documents"),
      ])

      let loc = profileRes.data.location || ""
      if (!loc) {
        try {
          const geo = await fetch("https://ipapi.co/json/")
          const geoData = await geo.json()
          if (geoData.city && geoData.region_code) {
            loc = `${geoData.city}, ${geoData.region_code}`
          }
        } catch {
          // silent
        }
      }
      setLocation(loc)

      const baseResumes = docsRes.data.base_resumes || []
      setHasBaseResumes(baseResumes.length > 0)
    } catch {
      // silent — fields just start empty
    } finally {
      setLoading(false)
    }
  }

  const startProgress = useCallback(() => {
    setProgressIdx(0)
    progressTimer.current = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length)
    }, 3000)
  }, [])

  const stopProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResult(null)

    if (!jdText.trim()) {
      setError("Please paste a job description")
      return
    }

    setGenerating(true)
    startProgress()

    try {
      const { data } = await apiClient.post("/generate", {
        location: location.trim(),
        jd_text: jdText.trim(),
        output_format: outputFormat,
      })
      setResult(data)
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      const detail = resp?.data?.detail || "Generation failed. Please try again."
      if (resp?.status === 429) {
        toast.error("Generation limit reached (10/hour)")
      } else {
        toast.error(`Generation failed: ${detail}`)
      }
      setError(detail)
    } finally {
      setGenerating(false)
      stopProgress()
    }
  }

  const handleGenerateAnother = () => {
    setJdText("")
    setResult(null)
    setError("")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!hasBaseResumes && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">No base resumes uploaded</p>
            <p>
              Upload at least one on the{" "}
              <Link to="/documents" className="underline font-medium">
                Documents page
              </Link>{" "}
              for best results.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generate Resume</CardTitle>
          <CardDescription>
            Paste a job description and get a tailored, ATS-optimized resume
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Chicago, IL"
                  disabled={generating}
                />
                <p className="text-xs text-muted-foreground">
                  Overrides your base location for this application only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jd">Job Description</Label>
                <textarea
                  id="jd"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here"
                  disabled={generating}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  style={{ minHeight: "200px" }}
                />
              </div>

              <div className="space-y-2">
                <Label>Output Format</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={outputFormat === "pdf"}
                      onChange={() => setOutputFormat("pdf")}
                      disabled={generating}
                      className="accent-primary"
                    />
                    <span className="text-sm">PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="docx"
                      checked={outputFormat === "docx"}
                      onChange={() => setOutputFormat("docx")}
                      disabled={generating}
                      className="accent-primary"
                    />
                    <span className="text-sm">DOCX</span>
                  </label>
                </div>
              </div>

              {generating ? (
                <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-4">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {PROGRESS_MESSAGES[progressIdx]}
                  </p>
                </div>
              ) : (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!jdText.trim()}
                >
                  Generate Resume
                </Button>
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              {/* ATS Score */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  ATS Score
                </p>
                <ATSScoreBadge score={result.ats_score} size="lg" />
              </div>

              {/* Format template notice */}
              {result.format_template_used && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Your format template was applied
                </div>
              )}

              {/* Matched Keywords */}
              {result.matched.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700">
                    Matched Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matched.map((kw) => (
                      <span
                        key={kw}
                        className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {result.missing.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-700">
                    Missing Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing.map((kw) => (
                      <span
                        key={kw}
                        className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() =>
                    window.open(result.download_url, "_blank")
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download {outputFormat.toUpperCase()}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleGenerateAnother}
                >
                  Generate Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
