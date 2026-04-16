import { Link, Outlet, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import supabase from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"

const navItems = [
  { path: "/", label: "Generate" },
  { path: "/documents", label: "Documents" },
  { path: "/instructions", label: "Instructions" },
  { path: "/history", label: "History" },
  { path: "/settings", label: "Settings" },
]

export default function Layout() {
  const location = useLocation()
  const { user } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold">
            ResumeTailor
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  location.pathname === item.path
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
