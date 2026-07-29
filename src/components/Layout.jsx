import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Users, ClipboardList, Truck, FileText,
  RotateCcw, BarChart3, History as HistoryIcon, Settings, LogOut,
  Menu, X, UserCog, Sun, Moon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { useTheme } from "../contexts/ThemeContext";
import FloatingFAB from "./FloatingFAB";
import NotificationBell from "./NotificationBell";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";

const SIDE = [
  { to: "/",               icon: LayoutDashboard, label: "Home",           roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/products",       icon: Package,         label: "Products",       roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/customers",      icon: Users,           label: "Customers",      roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/bookings",       icon: ClipboardList,   label: "Bookings",       roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/dispatch",       icon: Truck,           label: "Dispatch",       roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/estimates",      icon: FileText,        label: "Estimates",      roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/vendor-returns", icon: RotateCcw,       label: "Vendor Returns", roles: ["admin", "super_staff"] },
  { to: "/analytics",      icon: BarChart3,       label: "Analytics",      roles: ["admin", "manager"] },
  { to: "/history",        icon: HistoryIcon,     label: "History",        roles: ["admin", "manager"] },
  { to: "/users",          icon: UserCog,         label: "Users",          roles: ["admin"] },
  { to: "/settings",       icon: Settings,        label: "Settings",       roles: ["admin"] },
];

const BOTTOM = [
  { to: "/",         icon: LayoutDashboard, label: "Home" },
  { to: "/products", icon: Package,         label: "Products" },
  { to: "/bookings", icon: ClipboardList,   label: "Bookings" },
  { to: "/dispatch", icon: Truck,           label: "Dispatch" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  useBodyLock(drawer);
  useEscapeClose(() => setDrawer(false), drawer);

  const handleLogout = async () => { await logout(); navigate("/login"); };
  const allowed = (r) => !r || r.includes(user.role);
  const brandName = branding?.company_name || "SC Aura Kurtis";
  const logo = branding?.logo_url;

  const LogoBadge = ({ size = 36 }) => (
    logo
      ? <img src={logo} alt="logo" style={{ width: size, height: size }} className="rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15" />
      : <div style={{ width: size, height: size }} className="rounded-full grid place-items-center text-white font-display font-semibold" >
          <div className="w-full h-full rounded-full bg-[var(--sca-primary)] grid place-items-center text-[13px]">SC</div>
        </div>
  );

  return (
    <div className="min-h-screen flex text-white dark:text-white" style={{ background: "var(--sca-bg)", color: "var(--sca-text)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-white/5">
        <div className="px-5 py-5 flex items-center gap-3">
          <LogoBadge size={40} />
          <div className="min-w-0">
            <div className="font-display text-sm tracking-tight truncate">{brandName}</div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-[var(--sca-text-muted)]">Wholesale ERP</div>
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scroll-hide">
          console.log("SIDE", SIDE);
console.log("ROLE", user.role);
console.log("FILTERED", SIDE.filter((i) => allowed(i.roles)));
          {SIDE.filter((i) => allowed(i.roles)).map((item) => {
            const Icon = item.icon;
            const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
  active
    ? "bg-[var(--sca-primary)] text-white border border-transparent"
    : "text-[var(--sca-text-soft)] hover:bg-[var(--sca-surface-2)] hover:text-[var(--sca-text)] border border-transparent"
}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div
            onClick={() => navigate("/profile")}
            data-testid="sidebar-profile-link"
            className="glass rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.06] transition"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--sca-primary)] grid place-items-center text-white font-semibold text-sm">
              {(user?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">{(user?.role || "").replace("_", " ")}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} data-testid="logout-btn" className="text-white/50 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 border-r p-4 fade-up
              bg-white border-[var(--sca-border)] text-[var(--sca-text)]
              dark:bg-[#0e1218] dark:border-white/10 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 min-w-0">
                <LogoBadge size={32} />
                <div className="font-display text-base truncate">{brandName}</div>
              </div>
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {SIDE.filter((i) => allowed(i.roles)).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={`drawer-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => setDrawer(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--sca-primary)] text-white border border-transparent"
                        : "text-white/75 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <button onClick={handleLogout} className="w-full mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-red-500/10 text-red-300 hover:bg-red-500/15">
                <LogOut className="w-4 h-4" /> <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 px-3.5 lg:px-7 py-3 border-b border-white/5 flex items-center justify-between gap-2"
          style={{ background: "color-mix(in oklab, var(--sca-bg) 90%, transparent)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 lg:hidden min-w-0 flex-1">
            <button onClick={() => setDrawer(true)} data-testid="mobile-drawer-toggle" className="w-9 h-9 rounded-full glass grid place-items-center flex-shrink-0" aria-label="Open menu">
              <Menu className="w-4 h-4" />
            </button>
            <LogoBadge size={30} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm truncate leading-tight">{brandName}</div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-[var(--sca-text-muted)] truncate leading-tight">{getPageTitle(loc.pathname)}</div>
            </div>
          </div>
          <div className="hidden lg:block min-w-0">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">{titleOverline(user?.role)}</div>
            <div className="font-display text-xl tracking-tight truncate">{getPageTitle(loc.pathname)}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              data-testid="topbar-theme"
              title="Toggle theme"
              aria-label="Toggle theme"
              className="hidden sm:grid w-9 h-9 place-items-center rounded-full glass hover:bg-white/10 transition"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate("/profile")}
              data-testid="topbar-profile"
              title="My profile"
              aria-label="Profile"
              className="w-9 h-9 grid place-items-center rounded-full bg-[var(--sca-primary)] text-white text-xs font-semibold"
            >
              {(user?.name || "?").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="flex-1 px-3.5 lg:px-7 py-4 sm:py-5 pb-28 lg:pb-10">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="sca-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pt-2 pb-safe border-t border-white/10"
          style={{ background: "color-mix(in oklab, var(--sca-bg) 92%, transparent)", backdropFilter: "blur(10px)" }}
        >
          <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
            {BOTTOM.map((item) => <BottomItem key={item.to} item={item} />)}
          </div>
        </nav>
      </div>

      <FloatingFAB />
    </div>
  );
}

function BottomItem({ item }) {
  const loc = useLocation();
  const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      data-testid={`bottom-nav-${item.label.toLowerCase()}`}
      className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${
  active
    ? "text-[var(--sca-primary)]"
    : "text-[var(--sca-text-muted)]"
}`}
    >
      <Icon className={`w-5 h-5 ${active ? "opacity-100" : "opacity-80"}`} />
      <span className={`text-[10px] uppercase tracking-[0.18em] ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
    </NavLink>
  );
}

function titleOverline(role) {
  if (role === "admin") return "Super Admin";
  if (role === "manager") return "Manager Console";
  if (role === "super_staff") return "Super Staff";
  return "Operations";
}

function getPageTitle(path) {
  if (path === "/") return "Dashboard";
  if (path.startsWith("/products/new")) return "Add Product";
  if (path.startsWith("/products")) return "Inventory";
  if (path.startsWith("/customers")) return "Customers";
  if (path.startsWith("/bookings/new")) return "New Booking";
  if (path.startsWith("/bookings")) return "Bookings";
  if (path.startsWith("/dispatch/new")) return "New Dispatch";
  if (path.startsWith("/dispatch")) return "Dispatch";
  if (path.startsWith("/estimates/new")) return "New Estimate";
  if (path.startsWith("/estimates")) return "Estimates";
  if (path.startsWith("/vendor-returns/new")) return "New Vendor Return";
  if (path.startsWith("/vendor-returns")) return "Vendor Returns";
  if (path.startsWith("/analytics")) return "Analytics";
  if (path.startsWith("/history")) return "History";
  if (path.startsWith("/users")) return "User Management";
  if (path.startsWith("/profile")) return "My Profile";
  if (path.startsWith("/settings")) return "Settings";
  return "SC Aura";
}
