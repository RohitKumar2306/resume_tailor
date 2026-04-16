import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import supabase from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { LogOut } from "lucide-react"

const navItems = [
  { path: "/", label: "Generate" },
  { path: "/documents", label: "Documents" },
  { path: "/instructions", label: "Instructions" },
  { path: "/history", label: "History" },
  { path: "/settings", label: "Settings" },
]

function truncateEmail(email: string, max = 24): string {
  return email.length > max ? email.slice(0, max) + "..." : email
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/auth")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold tracking-tight">
            ResumeTailor
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {truncateEmail(user.email)}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
