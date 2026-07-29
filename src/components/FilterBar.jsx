import { Search, X } from "lucide-react";

/**
 * Compact, mobile-first filter row:
 *   - Full-width search input (visible in both themes)
 *   - Horizontally scrollable chip filters
 *   - Optional reset link
 */
export default function FilterBar({
  filters = [],
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  onReset,
  rightSlot,
}) {
  return (
    <div className="flex flex-col gap-3">
      {search !== undefined && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
            <input
              data-testid="filter-search"
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="aura-input pl-9 pr-9"
              inputMode="search"
              enterKeyHint="search"
              aria-label={searchPlaceholder}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                data-testid="filter-search-clear"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {rightSlot}
        </div>
      )}

      {filters.length > 0 && (
        <div className="-mx-1 px-1 flex gap-2 items-center overflow-x-auto scroll-hide">
          {filters.map((f) => (
            <div key={f.key} className="inline-flex items-center gap-1.5 flex-shrink-0">
              {f.options.map((o) => {
                const active = String(f.value) === String(o.value);
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    data-testid={`filter-${f.key}-${o.value}`}
                    onClick={() => f.onChange(o.value)}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] border whitespace-nowrap transition-colors ${
                      active
                        ? "bg-[var(--sca-primary)] text-white border-[var(--sca-primary)]"
                        : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
          {onReset && (
            <button
              type="button"
              data-testid="filter-reset"
              onClick={onReset}
              className="ml-auto text-[10px] uppercase tracking-[0.2em] text-white/55 hover:text-white flex-shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
