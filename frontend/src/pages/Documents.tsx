import { useEffect, useState, useCallback } from "react"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import FileUploadZone from "@/components/FileUploadZone"
import { Trash2, FileText } from "lucide-react"

interface DocItem {
  id: string
  file_name: string
  file_type: string
  uploaded_at: string
}

function DocSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border px-4 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Documents() {
  const [baseResumes, setBaseResumes] = useState<DocItem[]>([])
  const [styleDocs, setStyleDocs] = useState<DocItem[]>([])
  const [formatTemplate, setFormatTemplate] = useState<DocItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/documents")
      setBaseResumes(data.base_resumes || [])
      setStyleDocs(data.style_docs || [])
      setFormatTemplate(data.format_template || null)
    } catch {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleUpload = async (files: File[], fileType: string) => {
    setUploading(fileType)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("file_type", fileType)
        await apiClient.post("/documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }
      toast.success("Document uploaded and processed")
      await loadDocuments()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Upload failed"
      toast.error(`Upload failed: ${detail}`)
    } finally {
      setUploading(null)
    }
  }

  const handleTemplateUpload = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Only DOCX files are accepted as format templates")
      return
    }

    setUploading("format_template")
    try {
      const formData = new FormData()
      formData.append("file", file)
      await apiClient.post("/documents/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast.success("Format template saved")
      await loadDocuments()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Template upload failed"
      toast.error(`Upload failed: ${detail}`)
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (docId: string, docName: string) => {
    if (!window.confirm(`Delete "${docName}"? This cannot be undone.`)) return

    setDeleting(docId)
    try {
      await apiClient.delete(`/documents/${docId}`)
      toast.success("Document removed")
      await loadDocuments()
    } catch {
      toast.error("Delete failed")
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  const renderFileList = (docs: DocItem[]) =>
    docs.map((doc) => (
      <div
        key={doc.id}
        className="flex items-center justify-between rounded-md border px-4 py-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{doc.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(doc.uploaded_at)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(doc.id, doc.file_name)}
          disabled={deleting === doc.id}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Section 1: Base Resumes */}
      <Card>
        <CardHeader>
          <CardTitle>Base Resumes</CardTitle>
          <CardDescription>
            Upload your resume variants. The system searches across all of them
            to find the best matching content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadZone
            accept=".pdf,.docx"
            label="Upload PDF or DOCX resume files"
            multiple
            disabled={uploading === "base_resume"}
            onUpload={(files) => handleUpload(files, "base_resume")}
          />
          {uploading === "base_resume" && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
          {loading ? (
            <DocSkeleton />
          ) : baseResumes.length > 0 ? (
            <div className="space-y-2">{renderFileList(baseResumes)}</div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No base resumes yet. Upload your resume variants to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Style & Reference Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Style & Reference Documents</CardTitle>
          <CardDescription>
            Upload writing guides, keyword lists, or example resumes to guide
            the AI's writing style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadZone
            accept=".pdf,.docx"
            label="Upload PDF or DOCX style references"
            multiple
            disabled={uploading === "style_doc"}
            onUpload={(files) => handleUpload(files, "style_doc")}
          />
          {uploading === "style_doc" && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
          {loading ? (
            <DocSkeleton />
          ) : styleDocs.length > 0 ? (
            <div className="space-y-2">{renderFileList(styleDocs)}</div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No style documents yet. Upload writing references to guide the AI.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Format Template */}
      <Card>
        <CardHeader>
          <CardTitle>Format Template</CardTitle>
          <CardDescription>
            Upload one DOCX resume to use as the visual formatting blueprint.
            Fonts, colors, and spacing will be copied from this file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            DOCX files only. PDF is not accepted here.
          </div>

          {loading ? (
            <DocSkeleton />
          ) : formatTemplate ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {formatTemplate.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(formatTemplate.uploaded_at)}
                    </p>
                  </div>
                </div>
              </div>
              <FileUploadZone
                accept=".docx"
                label="Upload a new DOCX to replace current template"
                disabled={uploading === "format_template"}
                onUpload={handleTemplateUpload}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground italic">
                No format template uploaded. A clean default style will be used.
              </p>
              <FileUploadZone
                accept=".docx"
                label="Upload DOCX format template"
                disabled={uploading === "format_template"}
                onUpload={handleTemplateUpload}
              />
            </div>
          )}
          {uploading === "format_template" && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
