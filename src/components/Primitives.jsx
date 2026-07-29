/**
 * Reusable UI primitives used across the ERP.
 *
 * IMPORTANT: All amount / label typography here is NEUTRAL (slate) – gold is
 * intentionally reserved for the brand logo only.
 */

export function GlassCard({ children, className = "", ...rest }) {
  return (
    <div
      {...rest}
      className={`glass rounded-2xl p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * StatCard – Dashboard KPI tile. `accent` now just tightens the border and
 * makes the value bolder – NO gold gradients.
 */
export function StatCard({ label, value, hint, icon: Icon, accent = false, testid }) {
  return (
    <div
      data-testid={testid}
      className={`glass rounded-2xl p-5 flex flex-col gap-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.06] ${accent ? "ring-1 ring-[var(--sca-primary)]/15" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-white/45" />}
      </div>
      <div className="font-display text-2xl sm:text-3xl tracking-tight text-white">
        {value}
      </div>
      {hint && <div className="text-xs text-white/50">{hint}</div>}
    </div>
  );
}

/**
 * Pill – tiny status chip. Tones:
 *   default | neutral | primary | success | warning | danger | info
 */
export function Pill({ children, tone = "default", className = "", ...rest }) {
  const tones = {
    default:  "bg-white/8 text-white/80 border-white/12",
    neutral:  "bg-white/8 text-white/80 border-white/12",
    // "gold" tone kept for backward-compat but rendered as neutral primary now
    gold:     "bg-white/8 text-white/85 border-white/15",
    primary:  "bg-white/10 text-white border-white/15",
    success:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
    danger:   "bg-red-500/15 text-red-300 border-red-500/30",
    info:     "bg-sky-500/15 text-sky-300 border-sky-500/30",
  };
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] border ${tones[tone] || tones.default} ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ overline, title, action }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div className="min-w-0">
        {overline && (
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/45 mb-1">
            {overline}
          </div>
        )}
        <h2 className="font-display text-xl sm:text-2xl tracking-tight text-white truncate">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="glass rounded-2xl p-8 sm:p-10 text-center">
      <div className="font-display text-lg mb-1.5">{title}</div>
      {subtitle && <div className="text-sm text-white/55 mb-4">{subtitle}</div>}
      {action}
    </div>
  );
}
