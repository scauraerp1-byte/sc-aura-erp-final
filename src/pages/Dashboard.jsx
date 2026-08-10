import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import {
  Package,
  ClipboardList,
  Truck,
  FileText,
  AlertTriangle,
  ArrowRight,
  ScanLine,
  RotateCcw,
  BarChart3,
  IndianRupee,
  Activity,
  X,
  Loader2,
} from "lucide-react";
import QRScanner from "../components/QRScanner";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  testid,
  onClick,
}) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`text-left glass rounded-2xl p-4 sm:p-5 transition-all hover:bg-white/[0.07] active:scale-[0.99] ${
        accent ? "border-[#d4af37]/30" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-white/45">
          {label}
        </span>

        {Icon && (
          <Icon
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              accent
                ? "text-[#ebd281]"
                : "text-white/40"
            }`}
          />
        )}
      </div>

      <div
        className={`font-display text-2xl sm:text-3xl mt-2 tracking-tight ${
          accent
            ? "gold-text"
            : "text-white"
        }`}
      >
        {value}
      </div>
    </button>
  );
}

function QuickAction({
  label,
  icon: Icon,
  to,
  onClick,
  testid,
  accent,
}) {
  const navigate = useNavigate();

  return (
    <button
      data-testid={testid}
      onClick={() =>
        onClick
          ? onClick()
          : navigate(to)
      }
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-100 ${
        accent
          ? "bg-gradient-to-br from-[#d4af37] to-[#ebd281] text-black border-[#d4af37]"
          : "glass border-white/10 hover:bg-white/10"
      }`}
    >
      <Icon
        className={`w-4 h-4 ${
          accent
            ? "text-black"
            : "text-[#ebd281]"
        }`}
      />

      <span className="text-xs uppercase tracking-[0.18em] font-medium">
        {label}
      </span>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState(null);

  const [scanOpen, setScanOpen] =
    useState(false);

  const [productLoading, setProductLoading] =
    useState(false);

  const [scannedProduct, setScannedProduct] =
    useState(null);

  const [scanError, setScanError] =
    useState("");

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/analytics/home")
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  /*
   * OPEN SCANNER
   */
  const openScanner = () => {
    setScanError("");
    setScannedProduct(null);
    setScanOpen(true);
  };

  /*
   * QRScanner returns SR number.
   * Fetch actual product from backend.
   */
  const handleScan = async (text) => {
    const code = String(text || "")
      .trim()
      .toUpperCase();

    if (!code) return;

    setScanOpen(false);
    setScanError("");
    setScannedProduct(null);
    setProductLoading(true);

    try {
      const { data: product } =
        await api.get(
          `/products/by-sr/${encodeURIComponent(
            code
          )}`
        );

      setScannedProduct(product);
    } catch (e) {
      setScanError(
        `No product found with SR ${code}`
      );
    } finally {
      setProductLoading(false);
    }
  };

  const closeProduct = () => {
    setScannedProduct(null);
    setScanError("");
  };

  /*
   * BOOKING
   */
  const createBooking = () => {
    if (!scannedProduct) return;

    navigate("/bookings/new", {
      state: {
        preselectProduct:
          scannedProduct,
      },
    });

    setScannedProduct(null);
  };

  /*
   * ESTIMATE
   */
  const createEstimate = () => {
    if (!scannedProduct) return;

    navigate("/estimates/new", {
      state: {
        preselectProduct:
          scannedProduct,
      },
    });

    setScannedProduct(null);
  };

  /*
   * DISPATCH
   */
  const createDispatch = () => {
    if (!scannedProduct) return;

    navigate("/dispatch/new", {
      state: {
        preselectProduct:
          scannedProduct,
      },
    });

    setScannedProduct(null);
  };

  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map(
          (_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl shimmer"
            />
          )
        )}
      </div>
    );
  }

  const t = data.totals;
  const role = user.role;

  const canReturn =
    role === "admin" ||
    role === "super_staff";

  const canAnalytics =
    role === "admin" ||
    role === "manager";

  return (
    <>
      <div className="space-y-7">
        {/* Greeting */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">
              {getOverline(role)}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
              {getGreeting()},{" "}
              {user.name.split(" ")[0]}.
            </h1>

            <p className="text-sm text-white/55 mt-1">
              Wholesale operations at a glance.
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <QuickAction
            label="New Booking"
            icon={ClipboardList}
            to="/bookings/new"
            testid="home-quick-booking"
          />

          <QuickAction
            label="Dispatch"
            icon={Truck}
            to="/dispatch/new"
            testid="home-quick-dispatch"
            accent
          />

          <QuickAction
            label="Estimate"
            icon={FileText}
            to="/estimates/new"
            testid="home-quick-estimate"
          />

          <QuickAction
            label="Product"
            icon={Package}
            to="/products/new"
            testid="home-quick-product"
          />

          {/* SCAN SR */}
          <QuickAction
            label="Scan SR"
            icon={ScanLine}
            onClick={openScanner}
            testid="home-quick-scan"
          />

          {canReturn && (
            <QuickAction
              label="Return"
              icon={RotateCcw}
              to="/vendor-returns/new"
              testid="home-quick-return"
            />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatTile
            testid="stat-revenue-today"
            label="Today's Sales"
            value={`₹${Number(
              t.revenue_today || 0
            ).toLocaleString("en-IN")}`}
            icon={IndianRupee}
            accent
            onClick={() =>
              canAnalytics &&
              navigate("/analytics")
            }
          />

          <StatTile
            testid="stat-revenue-total"
            label="Total Revenue"
            value={`₹${Number(
              t.revenue_total || 0
            ).toLocaleString("en-IN")}`}
            icon={IndianRupee}
            onClick={() =>
              canAnalytics &&
              navigate("/analytics")
            }
          />

          <StatTile
            testid="stat-today-bookings"
            label="Today Bookings"
            value={t.bookings_today}
            icon={ClipboardList}
            onClick={() =>
              navigate("/bookings")
            }
          />

          <StatTile
            testid="stat-today-dispatch"
            label="Today Dispatch"
            value={t.dispatches_today}
            icon={Truck}
            onClick={() =>
              navigate("/dispatch")
            }
          />

          <StatTile
            testid="stat-products"
            label="Products"
            value={t.products}
            icon={Package}
            onClick={() =>
              navigate("/products")
            }
          />

          <StatTile
            testid="stat-bookings"
            label="Pending Dispatch"
            value={t.active_bookings}
            icon={ClipboardList}
            onClick={() =>
              navigate("/bookings")
            }
          />

          <StatTile
            testid="stat-estimates"
            label="Active Estimates"
            value={t.active_estimates}
            icon={FileText}
            onClick={() =>
              navigate("/estimates")
            }
          />

          <StatTile
            testid="stat-low-stock"
            label="Low Stock"
            value={t.low_stock_count}
            icon={AlertTriangle}
            onClick={() =>
              navigate("/products?low=1")
            }
          />
        </div>

        {/* Analytics */}
        {canAnalytics && (
          <GlassCard>
            <SectionTitle
              overline="Insights"
              title="Operational Analytics"
              action={
                <Link
                  to="/analytics"
                  className="text-xs text-[#ebd281] inline-flex items-center gap-1"
                >
                  Open
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />

            <div className="text-sm text-white/60 flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-[#ebd281]" />
              Revenue, top vendors, fast/slow
              movers, returns, sales by day —
              all in one place.
            </div>
          </GlassCard>
        )}

        {/* Recent + Low stock */}
        <div className="grid lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <SectionTitle
              overline="Recent"
              title="Latest Dispatches"
              action={
                <Link
                  to="/dispatch"
                  className="text-xs text-[#ebd281] inline-flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              }
            />

            <div className="divide-y divide-white/5">
              {data.recent_dispatches.length ===
                0 && (
                <div className="text-sm text-white/50 py-6 text-center">
                  No dispatches yet.
                </div>
              )}

              {data.recent_dispatches.map(
                (d) => (
                  <div
                    key={d.id}
                    data-testid={`recent-dispatch-${d.dispatch_no}`}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="font-display text-base">
                        {d.dispatch_no}
                      </div>

                      <div className="text-xs text-white/50">
                        {d.to} ·{" "}
                        {new Date(
                          d.created_at
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div className="text-sm gold-text font-display">
                        ₹
                        {Number(
                          d.amount || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </div>

                      <Pill
                        tone={
                          d.status ===
                          "delivered"
                            ? "success"
                            : "gold"
                        }
                      >
                        {d.status}
                      </Pill>
                    </div>
                  </div>
                )
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionTitle
              overline="Attention"
              title="Low Stock"
              action={
                data.low_stock.length >
                  0 && (
                  <Pill tone="warning">
                    <AlertTriangle className="w-3 h-3" />
                    {data.low_stock.length}
                  </Pill>
                )
              }
            />

            <div className="space-y-3">
              {data.low_stock.length ===
                0 && (
                <div className="text-sm text-white/50 py-4">
                  Everything well stocked ✦
                </div>
              )}

              {data.low_stock.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  data-testid={`low-stock-${p.sr_number}`}
                  className="flex items-center gap-3 hover:bg-white/[0.04] -mx-2 px-2 py-1.5 rounded-lg"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                    {p.image && (
                      <img
                        src={p.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {p.title}
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      {p.sr_number}
                    </div>
                  </div>

                  <div className="text-sm gold-text font-display">
                    {p.quantity}
                  </div>
                </Link>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-3">
            <SectionTitle
              overline="Timeline"
              title="Recent Activity"
              action={
                <span className="text-xs text-white/40 inline-flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  live
                </span>
              }
            />

            <div className="relative pl-6">
              <div className="absolute left-2 top-1 bottom-1 w-px bg-white/10" />

              {(data.activity || [])
                .length === 0 && (
                <div className="text-sm text-white/50 py-4 text-center">
                  No activity yet.
                </div>
              )}

              <div className="space-y-3">
                {(data.activity || []).map(
                  (ev, i) => {
                    const color =
                      ev.kind === "dispatch"
                        ? "bg-[#d4af37]"
                        : ev.kind ===
                          "booking"
                        ? "bg-amber-300"
                        : ev.kind ===
                          "estimate"
                        ? "bg-emerald-400"
                        : "bg-white/50";

                    return (
                      <div
                        key={i}
                        className="relative"
                        data-testid={`activity-${ev.kind}-${i}`}
                      >
                        <div
                          className={`absolute -left-4 top-1.5 w-2 h-2 rounded-full ${color}`}
                        />

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="text-sm">
                              {ev.title}
                            </div>

                            <div className="text-xs text-white/50">
                              {ev.sub}
                            </div>
                          </div>

                          <div className="text-[10px] text-white/40">
                            {new Date(
                              ev.ts
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* QR SCANNER */}
      <QRScanner
        open={scanOpen}
        onClose={() =>
          setScanOpen(false)
        }
        onScan={handleScan}
      />

      {/* PRODUCT RESULT */}
      {(productLoading ||
        scannedProduct ||
        scanError) && (
        <ScannedProductModal
          loading={productLoading}
          product={scannedProduct}
          error={scanError}
          onClose={closeProduct}
          onBooking={createBooking}
          onDispatch={createDispatch}
          onEstimate={createEstimate}
        />
      )}
    </>
  );
}

function ScannedProductModal({
  loading,
  product,
  error,
  onClose,
  onBooking,
  onDispatch,
  onEstimate,
}) {
  useBodyLock(true);
  useEscapeClose(onClose, true);

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => {
        if (
          e.target === e.currentTarget
        ) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-hidden rounded-2xl border border-white/15 bg-[#11151d] text-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#ebd281]">
              QR / SR Scanner
            </div>

            <h3 className="font-display text-xl mt-1 text-white">
              {loading
                ? "Finding Product…"
                : product
                ? "Product Found"
                : "Scan Failed"}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full grid place-items-center bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="py-14 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#ebd281] animate-spin" />

            <div className="text-sm text-white/60">
              Fetching product details…
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading &&
          error &&
          !product && (
            <div className="p-5">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="text-sm text-red-200">
                  {error}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full bg-white text-black py-2.5 mt-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-white/90"
              >
                Close
              </button>
            </div>
          )}

        {/* PRODUCT */}
        {!loading && product && (
          <div className="p-5 overflow-y-auto max-h-[calc(90dvh-82px)]">
            <div className="flex gap-4">
              {/* IMAGE */}
              <div className="w-24 h-28 rounded-xl overflow-hidden bg-white/[0.06] border border-white/10 flex-shrink-0">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <Package className="w-8 h-8 text-white/20" />
                  </div>
                )}
              </div>

              {/* INFO */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-[10px] font-mono-receipt font-medium text-[#ebd281]">
                  {product.sr_number}
                </div>

                <div className="text-lg font-semibold text-white mt-1 leading-snug">
                  {product.title}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {product.category && (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-medium text-white/80">
                      {product.category}
                    </span>
                  )}

                  {product.size_preset && (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-medium text-white/80">
                      {product.size_preset}
                    </span>
                  )}
                </div>

                <div className="text-2xl font-display font-semibold text-[#ebd281] mt-3">
                  ₹
                  {Number(
                    product.price || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </div>
              </div>
            </div>

            {/* CHOICE */}
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mb-3">
                What do you want to do?
              </div>

              <div className="grid gap-2.5">
                {/* BOOKING */}
                <button
                  type="button"
                  onClick={onBooking}
                  data-testid="scanned-product-booking"
                  className="w-full rounded-xl bg-white text-[#11151d] px-4 py-3.5 text-xs uppercase tracking-[0.18em] font-semibold inline-flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.99] transition"
                >
                  <ClipboardList className="w-4 h-4" />
                  Booking
                </button>

                {/* DISPATCH */}
                <button
                  type="button"
                  onClick={onDispatch}
                  data-testid="scanned-product-dispatch"
                  className="w-full rounded-xl bg-gradient-to-br from-[#d4af37] to-[#ebd281] text-black px-4 py-3.5 text-xs uppercase tracking-[0.18em] font-semibold inline-flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition"
                >
                  <Truck className="w-4 h-4" />
                  Dispatch
                </button>

                {/* ESTIMATE */}
                <button
                  type="button"
                  onClick={onEstimate}
                  data-testid="scanned-product-estimate"
                  className="w-full rounded-xl bg-white text-[#11151d] px-4 py-3.5 text-xs uppercase tracking-[0.18em] font-semibold inline-flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.99] transition"
                >
                  <FileText className="w-4 h-4" />
                  Estimate
                </button>
              </div>
            </div>

            <div className="text-[10px] text-white/35 text-center mt-4">
              Product fetched using the scanned SR
              number.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getOverline(role) {
  if (role === "admin")
    return "Super Admin";

  if (role === "manager")
    return "Owner Console";

  if (role === "super_staff")
    return "Super Staff";

  return "Operations";
}

function getGreeting() {
  const h = new Date().getHours();

  if (h < 12)
    return "Good morning";

  if (h < 17)
    return "Good afternoon";

  return "Good evening";
}
