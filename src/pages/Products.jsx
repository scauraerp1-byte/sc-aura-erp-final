import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Plus, Share2, Printer, Filter as FilterIcon } from "lucide-react";
import ShareCatalogueButton from "../components/ShareCatalogueButton";
import FilterBar from "../components/FilterBar";
import { cachedGet, bust } from "../lib/dataCache";
import useDebounced from "../hooks/useDebounced";

const CATEGORIES = [
  { value: "All",  label: "All"  },
  { value: "1 PC", label: "1 PC" },
  { value: "2 PC", label: "2 PC" },
  { value: "3 PC", label: "3 PC" },
];
const SORTS = [
  { value: "recently_added", label: "Recent" },
  { value: "fast_selling",   label: "Fast Selling" },
  { value: "slow_selling",   label: "Slow Selling" },
  { value: "low_stock",      label: "Low Stock" },
  { value: "price_asc",      label: "Price ↑" },
  { value: "price_desc",     label: "Price ↓" },
];

export default function Products() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("recently_added");
  const [vendor, setVendor] = useState("All");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const dq = useDebounced(q, 220);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { sort };
    if (dq) params.q = dq;
    if (cat !== "All") params.category = cat;
    if (vendor !== "All") params.vendor = vendor;
    try {
      // SWR – show cached list instantly if any, then refresh in background.
      const data = await cachedGet("products:list", "/products", {
        params, ttl: 15000,
        onFresh: (fresh) => setItems(fresh),
      });
      setItems(data);
    } finally { setLoading(false); }
  }, [dq, cat, sort, vendor]);

  useEffect(() => {
    cachedGet("products:vendors", "/products/vendors-list", { ttl: 120000 }).then(setVendors).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  // Bulk print QR labels for the currently visible filtered set
  const printAllLabels = () => {
    if (!items.length) return;
    const win = window.open("", "_blank", "width=560,height=780");
    if (!win) { alert("Please allow pop-ups to print labels."); return; }
    const cards = items.map((p) => `
      <div class="label">
        <div class="brand">SC AURA KURTIS</div>
        <div class="sr">${p.sr_number}</div>
        <div class="title">${(p.title || "").replace(/</g, "&lt;")}</div>
        <div class="meta">${p.category} · ${p.size_preset || ""}</div>
        <div class="price">₹${Number(p.price || 0).toLocaleString("en-IN")}</div>
      </div>`).join("");
    win.document.write(`<!doctype html><html><head><title>QR Labels — SC Aura Kurtis</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 12px; background: #fff; color: #111; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .label { border: 1px dashed #999; border-radius: 8px; padding: 12px; text-align: center; }
  .brand { font-size: 9px; letter-spacing: 3px; color: #666; text-transform: uppercase; }
  .sr { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; margin-top: 6px; }
  .title { font-size: 11px; margin-top: 4px; }
  .meta { font-size: 10px; color: #666; margin-top: 2px; }
  .price { font-size: 13px; font-weight: 700; margin-top: 6px; }
  @media print { body { padding: 0; } .label { break-inside: avoid; } }
</style></head><body>
<div class="grid">${cards}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        overline="Inventory"
        title="Products"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="products-filter-toggle"
              onClick={() => setShowFilters((v) => !v)}
              className="w-10 h-10 rounded-full glass grid place-items-center hover:bg-white/10 lg:hidden"
              aria-label="Toggle filters"
              title="Filters"
            >
              <FilterIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="products-print"
              onClick={printAllLabels}
              className="w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-full glass hover:bg-white/10 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em]"
              title="Print QR labels"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              data-testid="products-add"
              onClick={() => navigate("/products/new")}
              className="btn-primary rounded-full px-4 sm:px-5 py-2.5 text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Add </span>Product
            </button>
          </div>
        }
      />

      <div className={showFilters ? "block" : "hidden lg:block"}>
        <FilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Search by SR or product name…"
          filters={[
            { key: "cat",  label: "Category", value: cat,  onChange: setCat,  options: CATEGORIES },
            { key: "sort", label: "Sort",     value: sort, onChange: setSort, options: SORTS },
            ...(vendors.length > 0
              ? [{ key: "vendor", label: "Vendor", value: vendor, onChange: setVendor, options: [{ value: "All", label: "All" }, ...vendors.map((v) => ({ value: v, label: v }))] }]
              : []),
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl shimmer" />)}
        </div>
      ) : items.length === 0 ? (
        <GlassCard className="text-center py-12">
          <div className="font-display text-lg">No products match</div>
          <div className="text-sm text-white/55 mt-1">Try clearing filters or add a new product.</div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((p) => <ProductTile key={p.id} p={p} onShared={() => bust("products:")} />)}
        </div>
      )}
    </div>
  );
}

function ProductTile({ p, onShared }) {
  const total = p.quantity;
  const stockTone = total <= 10 ? "danger" : total <= 25 ? "warning" : null;
  const shared = !!p.last_shared_at;
  return (
    <Link
      to={`/products/${p.id}`}
      data-testid={`product-tile-${p.sr_number}`}
      className="glass rounded-2xl overflow-hidden block group"
    >
      <div className="aspect-[3/4] bg-white/5 overflow-hidden relative">
        {p.images?.[0]
          ? <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" alt={p.title} loading="lazy" />
          : <div className="w-full h-full grid place-items-center text-white/30 text-xs">No image</div>
        }

        {/* Top-left: category chip (minimal) */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide bg-black/55 text-white backdrop-blur-sm">
            {p.category}
          </span>
        </div>

        {/* Top-right: stock warning (only when relevant) */}
        {stockTone && (
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${stockTone === "danger" ? "bg-red-500 text-white" : "bg-amber-500 text-black"}`}>
              {total} pcs
            </span>
          </div>
        )}

        {/* Bottom-left: shared indicator (small, unobtrusive) */}
        {shared && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider bg-emerald-500/85 text-white">
              <Share2 className="w-2.5 h-2.5" /> Shared
            </span>
          </div>
        )}

        {/* Hover-only share icon (desktop) */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ShareCatalogueButton product={p} variant="icon" onShared={onShared} />
        </div>
      </div>

      <div className="p-3">
        <div className="text-[10px] font-mono-receipt tracking-wide text-white/60">{p.sr_number}</div>
        <div className="text-sm mt-0.5 truncate font-medium">{p.title}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-white/55">{p.size_preset}</span>
          <span className="text-base font-display tabular-nums">
            ₹{Number(p.price).toLocaleString("en-IN")}
          </span>
        </div>
        {!stockTone && (
          <div className="text-[10px] text-white/45 mt-1">In stock · {total} pcs</div>
        )}
      </div>
    </Link>
  );
}
