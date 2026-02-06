import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  Image,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/library", label: "Library", icon: Image },
  { path: "/profile", label: "Profile", icon: User },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-64 gradient-sidebar border-r border-sidebar-border">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-sidebar-primary" />
            <span className="text-xl font-display font-bold text-sidebar-foreground">KurtiAI</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-sidebar-foreground/50 uppercase tracking-wider">Business</p>
            <p className="text-sm text-sidebar-foreground font-medium truncate">
              {profile?.business_name || "Not set"}
            </p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-lg font-display font-bold">KurtiAI</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-16"
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-base text-destructive"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </motion.div>
      )}

      {/* Main content */}
      <main className="flex-1 md:overflow-auto">
        <div className="pt-16 md:pt-0">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
