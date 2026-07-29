const PRESETS = {
  "M-XL":       ["M", "L", "XL"],
  "M-XXL":      ["M", "L", "XL", "XXL"],
  "M-XXXL":     ["M", "L", "XL", "XXL", "XXXL"],
  "M-XXXXL":    ["M", "L", "XL", "XXL", "XXXL", "XXXXL"],
  "M-XXXXXL":   ["M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"],
};

export function SizePresetSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="size-preset-selector">
      {Object.keys(PRESETS).map((k) => (
        <button
          key={k}
          type="button"
          data-testid={`size-preset-${k}`}
          onClick={() => onChange(k)}
          className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-[0.18em] border transition-colors ${
            value === k
              ? "bg-[var(--sca-primary)] text-white border-[var(--sca-primary)]"
              : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

export function SizeQuantityEditor({ preset, value = {}, onChange, max }) {
  const sizes = PRESETS[preset] || [];
  const setSize = (s, n) => {
    const next = { ...value };
    if (n <= 0) delete next[s]; else next[s] = n;
    onChange(next);
  };
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-testid="size-qty-editor">
      {sizes.map((s) => {
        const q = value[s] || 0;
        const stockLeft = max ? max[s] ?? 0 : undefined;
        return (
          <div key={s} className="glass rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/65">{s}</span>
              {stockLeft !== undefined && (
                <span className="text-[10px] text-white/45">Stk {stockLeft}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSize(s, Math.max(0, q - 1))}
                className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-sm leading-none"
              >−</button>
              <input
                type="number"
                value={q}
                min={0}
                max={stockLeft}
                onChange={(e) => setSize(s, Math.max(0, parseInt(e.target.value || "0", 10)))}
                className="w-full bg-transparent text-center text-sm outline-none tabular-nums"
                data-testid={`size-qty-input-${s}`}
              />
              <button
                type="button"
                onClick={() => setSize(s, stockLeft !== undefined ? Math.min(stockLeft, q + 1) : q + 1)}
                className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-sm leading-none"
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PRESETS };
