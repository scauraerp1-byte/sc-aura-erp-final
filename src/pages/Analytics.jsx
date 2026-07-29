import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, Flame, Package, Boxes, RotateCcw, Users, IndianRupee, ArrowDownRight, AlertTriangle } from "lucide-react";
import { formatRupee } from "../lib/share";
import FilterBar from "../components/FilterBar";

function Tile({ label, value, icon: Icon, accent }) {
  return (
    <div className={`glass rounded-2xl p-4 ${accent ? "border-[#d4af37]/30" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${accent ? "text-[#ebd281]" : "text-white/40"}`} />}
      </div>
      <div className={`font-display text-2xl mt-2 ${accent ? "gold-text" : ""}`}>{value}</div>
    </div>
  );
}

function ProductList({ rows, label }) {
  if (!rows || rows.length === 0) return <div className="text-sm text-white/50 py-4 text-center">No data.</div>;
  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <div key={p.product_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04]">
          <div className="w-11 h-11 rounded-xl bg-white/5 overflow-hidden border border-white/10 flex-shrink-0">
            {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{p.title}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{p.sr_number} · {p.category}</div>
          </div>
          <div className="text-right">
            <div className="font-display gold-text">{p.sold_qty}</div>
            <div className="text-[10px] text-white/40">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("weekly");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("");
  const [vendors, setVendors] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const load = () => {
    const params = { period };
    if (vendor) params.vendor = vendor;
    if (category) params.category = category;
    if (start && end) {
      // ISO with timezone
      const s = new Date(start + "T00:00:00").toISOString();
      const e = new Date(end + "T23:59:59").toISOString();
      params.start = s;
      params.end = e;
    }
    api.get("/analytics/overview", { params }).then((r) => setData(r.data));
  };
  useEffect(() => { api.get("/analytics/vendors").then((r) => setVendors(r.data)); }, []);
  useEffect(load, [period, vendor, category, start, end]);

  if (!data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}</div>;
  }

  const t = data.totals;

  return (
    <div className="space-y-6">
      <SectionTitle overline="Insights" title="Operational Analytics" />

      <GlassCard>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Period</div>
            <div className="flex flex-wrap gap-2">
              {["daily", "weekly", "monthly", "yearly"].map((p) => (
                <button
                  key={p}
                  data-testid={`period-${p}`}
                  onClick={() => { setPeriod(p); setStart(""); setEnd(""); }}
                  className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] border ${period === p && !start ? "bg-[#d4af37] text-black border-[#d4af37]" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Vendor</div>
            <select className="aura-input" value={vendor} onChange={(e) => setVendor(e.target.value)} data-testid="analytics-vendor">
              <option value="">All vendors</option>
              {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Category</div>
            <select className="aura-input" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="analytics-category">
              <option value="">All categories</option>
              <option value="1 PC">1 PC</option>
              <option value="2 PC">2 PC</option>
              <option value="3 PC">3 PC</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">From</span>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="aura-input text-xs" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">To</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="aura-input text-xs" />
            </label>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Total Revenue" value={formatRupee(t.revenue)} icon={IndianRupee} accent />
        <Tile label="Total Pieces Sold" value={t.pieces} icon={Boxes} />
        <Tile label="Dispatch Orders" value={t.orders} icon={Package} />
        <Tile label="Bookings" value={t.bookings} icon={TrendingUp} />
        <Tile label="Returned Pieces" value={t.returns} icon={RotateCcw} />
        <Tile label="Active Customers" value={t.active_customers} icon={Users} />
      </div>

      {/* Sales trend */}
      <GlassCard>
        <SectionTitle overline="Trend" title="Sales over time" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af37" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              <Area type="monotone" dataKey="revenue" stroke="#d4af37" fill="url(#gRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard>
          <SectionTitle overline="Top sellers" title="Most Ordered" />
          <ProductList rows={data.most_ordered} label="sold" />
        </GlassCard>
        <GlassCard>
          <SectionTitle overline="Hot" title="Trending (24h)" />
          <ProductList rows={data.trending} label="demand" />
        </GlassCard>
        <GlassCard>
          <SectionTitle overline="Speed" title="Fast Selling" />
          <ProductList rows={data.fast_selling} label="sold" />
        </GlassCard>
        <GlassCard>
          <SectionTitle overline="Sluggish" title="Slow Selling" />
          <ProductList rows={data.slow_selling} label="sold" />
        </GlassCard>
        <GlassCard>
          <SectionTitle overline="Quality" title="Most Returned" />
          <ProductList rows={data.most_returned} label="returned" />
        </GlassCard>
        <GlassCard>
          <SectionTitle overline="Attention" title="Low Stock" />
          {data.low_stock_alerts.length === 0 && <div className="text-sm text-white/50 py-4 text-center">All good ✦</div>}
          <div className="space-y-2">
            {data.low_stock_alerts.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden border border-white/10 flex-shrink-0">
                  {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.title}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{p.sr_number}</div>
                </div>
                <div className="text-sm gold-text font-display">{p.quantity}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard>
          <SectionTitle overline="Best vendors" title="Top performing vendors" />
          {data.best_vendors.length === 0 && <div className="text-sm text-white/50 py-4 text-center">No vendor data.</div>}
          <div className="space-y-2">
            {data.best_vendors.map((v) => (
              <div key={v.vendor} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5">
                <div>
                  <div className="text-sm">{v.vendor}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{v.pieces} pcs</div>
                </div>
                <div className="font-display gold-text">{formatRupee(v.revenue)}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle overline="Loyal" title="Most Active Customers" />
          {data.best_customers.length === 0 && <div className="text-sm text-white/50 py-4 text-center">No customer data.</div>}
          <div className="space-y-2">
            {data.best_customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5">
                <div>
                  <div className="text-sm">{c.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{c.shop_name} · {c.orders} orders</div>
                </div>
                <div className="font-display gold-text">{formatRupee(c.revenue)}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle overline="Volume" title="Top Dispatch Destinations" />
          {data.top_dispatch_to.length === 0 && <div className="text-sm text-white/50 py-4 text-center">No data.</div>}
          <div className="space-y-2">
            {data.top_dispatch_to.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/5">
                <div className="text-sm">{t.name}</div>
                <div className="font-display gold-text">{t.pieces} pcs</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle overline="Mix" title="Category Breakdown" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_breakdown}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="category" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
                <Bar dataKey="pieces" fill="#d4af37" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
