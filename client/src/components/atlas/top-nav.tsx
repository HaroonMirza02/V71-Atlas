import { Link, useLocation } from "react-router-dom";
import { Radar, Search, X, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { to: "/", label: "Overview", exact: true },
  { to: "/signals", label: "Signals" },
];

export function TopNav() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-[1400px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:flex-nowrap">
        <Link to="/" className="flex min-w-fit items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-[6px] bg-foreground text-background shadow">
            <Radar className="h-4 w-4" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">Atlas Intelligence</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex ml-4">
          {nav.map((n) => {
            const isActive = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                  isActive 
                    ? "text-foreground bg-accent" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-border/50">
            <div className="text-right hidden sm:block">
               <div className="text-[11px] font-medium leading-none">{user?.name || 'User'}</div>
               <div className="text-[9px] text-muted-foreground mt-0.5">{user?.role || 'VIEWER'}</div>
            </div>
            <div
              className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-[10px] font-medium text-background"
            >
              {user?.name?.substring(0,2).toUpperCase() || 'V71'}
            </div>
          </div>
          <button 
             onClick={logout}
             className="text-muted-foreground hover:text-foreground transition-colors p-1"
             title="Logout"
          >
             <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Mobile nav row */}
      <div className="md:hidden border-t border-border/70 overflow-x-auto">
        <div className="flex items-center gap-1 px-4 py-2">
          {nav.map((n) => {
             const isActive = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
             return (
              <Link
                key={n.to}
                to={n.to}
                className={`shrink-0 px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                  isActive ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
             );
          })}
        </div>
      </div>
    </header>
  );
}
