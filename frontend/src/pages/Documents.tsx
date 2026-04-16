import { useEffect, useState, useCallback } from "react"
import apiClient from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import FileUploadZone from "@/components/FileUploadZone"
import { Trash2, FileText, AlertCircle } from "lucide-react"

interface DocItem {
  id: string
  file_name: string
  file_type: string
  uploaded_at: string
}

export default function Documents() {
  const [baseResumes, setBaseResumes] = useState<DocItem[]>([])
  const [styleDocs, setStyleDocs] = useState<DocItem[]>([])
  const [formatTemplate, setFormatTemplate] = useState<DocItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const clearMessage = () => {
    setTimeout(() => setMessage(null), 4000)
  }

  const loadDocuments = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/documents")
      setBaseResumes(data.base_resumes || [])
      setStyleDocs(data.style_docs || [])
      setFormatTemplate(data.format_template || null)
    } catch {
      setMessage({ type: "error", text: "Failed to load documents" })
      clearMessage()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleUpload = async (files: File[], fileType: string) => {
    setUploading(fileType)
    setMessage(null)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("file_type", fileType)
        await apiClient.post("/documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }
      setMessage({
        type: "success",
        text: `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`,
      })
      clearMessage()
      await loadDocuments()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Upload failed"
      setMessage({ type: "error", text: detail })
      clearMessage()
    } finally {
      setUploading(null)
    }
  }

  const handleTemplateUpload = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setMessage({
        type: "error",
        text: "Only DOCX files are accepted as format templates",
      })
      clearMessage()
      return
    }

    setUploading("format_template")
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      await apiClient.post("/documents/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setMessage({ type: "success", text: "Format template uploaded" })
      clearMessage()
      await loadDocuments()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Template upload failed"
      setMessage({ type: "error", text: detail })
      clearMessage()
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (docId: string, docName: string) => {
    if (!window.confirm(`Delete "${docName}"? This cannot be undone.`)) return

    setDeleting(docId)
    setMessage(null)

    try {
      await apiClient.delete(`/documents/${docId}`)
      setMessage({ type: "success", text: `"${docName}" deleted` })
      clearMessage()
      await loadDocuments()
    } catch {
      setMessage({ type: "error", text: "Delete failed" })
      clearMessage()
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
          {baseResumes.length > 0 && (
            <div className="space-y-2">
              {baseResumes.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.file_name}
                      </p>
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
              ))}
            </div>
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
          {styleDocs.length > 0 && (
            <div className="space-y-2">
              {styleDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.file_name}
                      </p>
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
              ))}
            </div>
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

          {formatTemplate ? (
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
                No format template uploaded. A default clean style will be used.
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
