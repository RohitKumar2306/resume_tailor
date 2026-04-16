import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Toaster } from "@/components/ui/sonner"
import ErrorBoundary from "@/components/ErrorBoundary"
import Layout from "@/components/Layout"
import ProtectedRoute from "@/components/ProtectedRoute"
import Auth from "@/pages/Auth"
import Generate from "@/pages/Generate"
import Documents from "@/pages/Documents"
import Instructions from "@/pages/Instructions"
import History from "@/pages/History"
import Settings from "@/pages/Settings"

function AuthGuard() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Auth />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthGuard />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Generate />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/instructions" element={<Instructions />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </ErrorBoundary>
  )
}
