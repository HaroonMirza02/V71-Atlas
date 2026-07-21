import { Link, useLocation } from "react-router-dom";
import { Radar, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { to: "/", label: "Overview", exact: true },
  { to: "/signals", label: "Signals" },
];

export function TopNav() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 relative">
        
        {/* Left Side: Logo */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background shadow-sm">
              <Radar className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Atlas Intelligence</span>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-8 h-16">
            {nav.map((n) => {
              const isActive = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`relative flex h-full items-center text-sm font-medium transition-colors ${
                    isActive 
                      ? "text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </nav>

        {/* Right Side: Profile & Actions */}
        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-3.5">
             <div className="flex flex-col items-end justify-center">
                <span className="text-[13px] font-medium leading-none text-foreground">{user?.name || 'System Admin'}</span>
                <span className="text-[11px] font-semibold text-muted-foreground mt-1.5 uppercase tracking-wider">{user?.role || 'ADMIN'}</span>
             </div>
             <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/30 text-xs font-semibold text-foreground">
               {user?.name?.substring(0,2).toUpperCase() || 'SY'}
             </div>
          </div>
          
          <div className="h-5 w-px bg-border hidden sm:block"></div>
          
          <button 
             onClick={logout}
             className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
             title="Logout"
          >
             <LogOut className="h-[18px] w-[18px]" />
             <span className="sr-only">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Mobile nav row (scrollable) */}
      <div className="md:hidden border-t border-border bg-background">
        <nav className="flex items-center gap-6 overflow-x-auto px-4 scrollbar-none">
          {nav.map((n) => {
             const isActive = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
             return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative flex h-14 shrink-0 items-center text-sm font-medium transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-t-full" />
                )}
              </Link>
             );
          })}
        </nav>
      </div>
    </header>
  );
}
