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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 relative">
        
        {/* Left Side: Logo */}
        <div className="flex items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background shadow-xs">
              <Radar className="h-4.5 w-4.5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground font-sans">Atlas Intelligence</span>
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
                className={`relative flex h-full items-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-2 rounded-md ${
                  isActive 
                    ? "text-foreground font-semibold" 
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
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end justify-center">
                <span className="text-[13px] font-medium leading-none text-foreground">{user?.name || 'System Admin'}</span>
                <span className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wider num">{user?.role || 'ADMIN'}</span>
             </div>
             <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
               {user?.name?.substring(0,2).toUpperCase() || 'SY'}
             </div>
          </div>
          
          <div className="h-5 w-px bg-border"></div>
          
          <button 
             onClick={logout}
             className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
             title="Logout"
             aria-label="Logout"
          >
             <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Mobile nav row (scrollable) */}
      <div className="md:hidden border-t border-border bg-white">
        <nav className="flex items-center gap-6 overflow-x-auto px-4 scrollbar-none">
          {nav.map((n) => {
             const isActive = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
             return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative flex h-12 shrink-0 items-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
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
