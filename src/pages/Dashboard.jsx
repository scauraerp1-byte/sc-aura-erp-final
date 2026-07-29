import { useEffect, useState, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { Package, Boxes, Users, ClipboardList, Truck, FileText, AlertTriangle, ArrowRight, ScanLine, RotateCcw, BarChart3, IndianRupee, Activity } from "lucide-react";
import { cachedGet } from "../lib/dataCache";

function StatTile({ label, value, icon: Icon, accent, testid, onClick }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`text-left glass rounded-2xl p-4 sm:p-5 transition-all hover:bg-white/[0.07] active:scale-[0.99] ${accent ? "border-[#d4af37]/30" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</span>
        {Icon && <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accent ? "text-[#ebd281]" : "text-white/40"}`} />}
      </div>
      <div className="font-display text-2xl sm:text-3xl mt-2 tracking-tight text-white">{value}</div>
    </button>
  );
}

function QuickAction({ label, icon: Icon, to, testid, accent }) {
  const navigate = useNavigate();
  return (
    <button
      data-testid={testid}
      onClick={() => navigate(to)}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-colors hover:bg-white/[0.07] ${
        accent
          ? "bg-[var(--sca-primary)] text-white border-[var(--sca-primary)]"
          : "glass border-white/10"
      }`}
    >
      <Icon className={`w-4 h-4 ${accent ? "text-white" : "text-white/70"}`} />
      <span className="text-xs uppercase tracking-[0.18em] font-medium">{label}</span>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // SWR: show cached copy immediately, revalidate in background so the
    // page never feels slow after the very first visit.
    let mounted = true;
    cachedGet("analytics:home", "/analytics/home", {
      ttl: 60_000,
      onFresh: (fresh) => { if (mounted) setData(fresh); },
    }).then((d) => { if (mounted) setData(d); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
      </div>
    );
  }

  const t = data.totals;
  const role = user.role;
  const canReturn = role === "admin" || role === "super_staff";
  const canAnalytics = role === "admin" || role === "manager";

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">{getOverline(role)}</div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">{getGreeting()}, {user.name.split(" ")[0]}.</h1>
          <p className="text-sm text-white/55 mt-1">Wholesale operations at a glance.</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <QuickAction label="New Booking" icon={ClipboardList} to="/bookings/new" testid="home-quick-booking" />
        <QuickAction label="Dispatch" icon={Truck} to="/dispatch/new" testid="home-quick-dispatch" accent />
        <QuickAction label="Estimate" icon={FileText} to="/estimates/new" testid="home-quick-estimate" />
        <QuickAction label="Product" icon={Package} to="/products/new" testid="home-quick-product" />
        <QuickAction label="Scan SR" icon={ScanLine} to="/dispatch/new" testid="home-quick-scan" />
        {canReturn && <QuickAction label="Return" icon={RotateCcw} to="/vendor-returns/new" testid="home-quick-return" />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatTile testid="stat-revenue-today" label="Today's Sales" value={`₹${Number(t.revenue_today || 0).toLocaleString("en-IN")}`} icon={IndianRupee} accent onClick={() => canAnalytics && navigate("/analytics")} />
        <StatTile testid="stat-revenue-total" label="Total Revenue" value={`₹${Number(t.revenue_total || 0).toLocaleString("en-IN")}`} icon={IndianRupee} onClick={() => canAnalytics && navigate("/analytics")} />
        <StatTile testid="stat-today-bookings" label="Today Bookings" value={t.bookings_today} icon={ClipboardList} onClick={() => navigate("/bookings")} />
        <StatTile testid="stat-today-dispatch" label="Today Dispatch" value={t.dispatches_today} icon={Truck} onClick={() => navigate("/dispatch")} />
        <StatTile testid="stat-products" label="Products" value={t.products} icon={Package} onClick={() => navigate("/products")} />
        <StatTile testid="stat-bookings" label="Pending Dispatch" value={t.active_bookings} icon={ClipboardList} onClick={() => navigate("/bookings")} />
        <StatTile testid="stat-estimates" label="Active Estimates" value={t.active_estimates} icon={FileText} onClick={() => navigate("/estimates")} />
        <StatTile testid="stat-low-stock" label="Low Stock" value={t.low_stock_count} icon={AlertTriangle} onClick={() => navigate("/products?low=1")} />
      </div>

      {canAnalytics && (
        <GlassCard>
          <SectionTitle
            overline="Insights"
            title="Operational Analytics"
            action={<Link to="/analytics" className="text-xs text-[#ebd281] inline-flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="text-sm text-white/60 flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-[#ebd281]" />
            Revenue, top vendors, fast/slow movers, returns, sales by day — all in one place.
          </div>
        </GlassCard>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionTitle
            overline="Recent"
            title="Latest Dispatches"
            action={<Link to="/dispatch" className="text-xs text-[#ebd281] inline-flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="divide-y divide-white/5">
            {data.recent_dispatches.length === 0 && <div className="text-sm text-white/50 py-6 text-center">No dispatches yet.</div>}
            {data.recent_dispatches.map((d) => (
              <div key={d.id} data-testid={`recent-dispatch-${d.dispatch_no}`} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-display text-base">{d.dispatch_no}</div>
                  <div className="text-xs text-white/50">{d.to} · {new Date(d.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="text-sm font-display tabular-nums">₹{Number(d.amount || 0).toLocaleString("en-IN")}</div>
                  <Pill tone={d.status === "delivered" ? "success" : "gold"}>{d.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle overline="Attention" title="Low Stock"
            action={data.low_stock.length > 0 && <Pill tone="warning"><AlertTriangle className="w-3 h-3" />{data.low_stock.length}</Pill>}
          />
          <div className="space-y-3">
            {data.low_stock.length === 0 && <div className="text-sm text-white/50 py-4">Everything well stocked ✦</div>}
            {data.low_stock.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} data-testid={`low-stock-${p.sr_number}`} className="flex items-center gap-3 hover:bg-white/[0.04] -mx-2 px-2 py-1.5 rounded-lg">
                <div className="w-11 h-11 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                  {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.title}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{p.sr_number}</div>
                </div>
                <div className="text-sm font-display tabular-nums">{p.quantity}</div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-3">
          <SectionTitle overline="Timeline" title="Recent Activity"
            action={<span className="text-xs text-white/40 inline-flex items-center gap-1"><Activity className="w-3 h-3" /> live</span>}
          />
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-white/10" />
            {(data.activity || []).length === 0 && <div className="text-sm text-white/50 py-4 text-center">No activity yet.</div>}
            <div className="space-y-3">
              {(data.activity || []).map((ev, i) => {
                const color = ev.kind === "dispatch" ? "bg-[#d4af37]" : ev.kind === "booking" ? "bg-amber-300" : ev.kind === "estimate" ? "bg-emerald-400" : "bg-white/50";
                return (
                  <div key={i} className="relative" data-testid={`activity-${ev.kind}-${i}`}>
                    <div className={`absolute -left-4 top-1.5 w-2 h-2 rounded-full ${color}`} />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-sm">{ev.title}</div>
                        <div className="text-xs text-white/50">{ev.sub}</div>
                      </div>
                      <div className="text-[10px] text-white/40">{new Date(ev.ts).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function getOverline(role) {
  if (role === "admin") return "Super Admin";
  if (role === "manager") return "Owner Console";
  if (role === "super_staff") return "Super Staff";
  return "Operations";
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
