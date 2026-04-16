import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import ATSScoreBadge from "@/components/ATSScoreBadge"
import {
  Download,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  CheckCircle,
} from "lucide-react"
import type { GenerationHistoryItem } from "@/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function truncateJd(text: string, max = 80) {
  return text.length > max ? text.slice(0, max) + "..." : text
}

function GenerationCard({ item }: { item: GenerationHistoryItem }) {
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const matched = item.keyword_coverage?.matched || []
  const missing = item.keyword_coverage?.missing || []

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { data } = await apiClient.get(
        `/generations/${item.id}/download`
      )
      if (data.download_url) {
        window.open(data.download_url, "_blank")
      }
    } catch {
      toast.error("Failed to get download link")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        {/* Row 1: JD preview + ATS score */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-foreground flex-1 leading-relaxed">
            {truncateJd(item.jd_text)}
          </p>
          <ATSScoreBadge score={item.ats_score} size="sm" />
        </div>

        {/* Row 2: Location, format, date */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {item.location_used}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-medium uppercase">
            <FileText className="h-3 w-3" />
            {item.output_format}
          </span>
          <span>{formatDate(item.generated_at)}</span>
        </div>

        {/* Row 3: Format template badge */}
        {item.format_template_used && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3" />
            Format template applied
          </div>
        )}

        {/* Keyword breakdown toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {expanded ? "Hide" : "Show"} keyword breakdown
        </button>

        {expanded && (
          <div className="space-y-3 pt-1">
            {matched.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-green-700">
                  {matched.length} keywords matched
                </p>
                <div className="flex flex-wrap gap-1">
                  {matched.map((kw) => (
                    <span
                      key={kw}
                      className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {missing.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-red-700">
                  {missing.length} missing
                </p>
                <div className="flex flex-wrap gap-1">
                  {missing.map((kw) => (
                    <span
                      key={kw}
                      className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {matched.length === 0 && missing.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No keyword data available
              </p>
            )}
          </div>
        )}

        {/* Download button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full"
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          {downloading
            ? "Getting link..."
            : `Download ${item.output_format.toUpperCase()}`}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function History() {
  const [generations, setGenerations] = useState<GenerationHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGenerations()
  }, [])

  const loadGenerations = async () => {
    try {
      const { data } = await apiClient.get("/generations")
      setGenerations(data || [])
    } catch {
      toast.error("Failed to load generation history")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No resumes generated yet.
        </p>
        <Link
          to="/"
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Go to Generate &rarr;
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Generation History</h1>
      <p className="text-sm text-muted-foreground">
        {generations.length} generation{generations.length !== 1 ? "s" : ""}
      </p>
      {generations.map((item) => (
        <GenerationCard key={item.id} item={item} />
      ))}
    </div>
  )
}
