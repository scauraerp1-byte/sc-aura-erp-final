import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Type } from "lucide-react";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";

/**
 * QR Scanner modal – always centred, blocks body scroll while open.
 * On camera failure it degrades gracefully to a manual-entry field, so the
 * user never sees a broken/blank scanner.
 */
export default function QRScanner({ open, onClose, onScan }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  useBodyLock(open);
  useEscapeClose(onClose, open);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError("");
    setManual("");

    // Slight delay so the div is mounted before Html5Qrcode inspects it.
    const t = setTimeout(() => {
      if (cancelled) return;
      const id = "qr-scanner-region";
      const elem = document.getElementById(id);
      if (!elem) return;
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            try { scanner.stop().then(() => scanner.clear()).catch(() => {}); } catch {}
            onScan?.(String(text).trim().toUpperCase());
          },
          () => {}
        )
        .catch((e) => setError(e?.message || "Camera unavailable. Use manual entry below."));
    }, 30);

    return () => {
      cancelled = true;
      clearTimeout(t);
      const s = scannerRef.current;
      if (s) {
        try { s.stop().then(() => s.clear()).catch(() => {}); } catch {}
      }
      scannerRef.current = null;
    };
  }, [open, onScan]);

  if (!open) return null;

  const submitManual = (e) => {
    e.preventDefault();
    const v = manual.trim().toUpperCase();
    if (v) onScan?.(v);
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm grid place-items-center modal-viewport"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-shell w-full max-w-sm rounded-2xl border shadow-2xl fade-up
        bg-white border-[var(--sca-border)] text-[var(--sca-text)]
        dark:bg-[#11151d] dark:border-white/12 dark:text-white">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--sca-border)] dark:border-white/10">
          <div className="inline-flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="font-display text-base">Scan Product QR</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="qr-close"
            aria-label="Close scanner"
            className="w-8 h-8 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body p-4">
          <div
            id="qr-scanner-region"
            ref={containerRef}
            className="w-full overflow-hidden rounded-xl border border-[var(--sca-border)] dark:border-white/10 bg-black aspect-square max-h-[52dvh]"
          />
          {error && (
            <div className="mt-3 text-xs text-amber-600 dark:text-amber-300/90">{error}</div>
          )}
          <form onSubmit={submitManual} className="mt-3">
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
              <input
                autoFocus={!!error}
                value={manual}
                onChange={(e) => setManual(e.target.value.toUpperCase())}
                placeholder="SCA-00001"
                className="aura-input pl-10 uppercase font-mono-receipt"
                data-testid="qr-manual-input"
              />
            </div>
            <button
              type="submit"
              disabled={!manual.trim()}
              data-testid="qr-manual-submit"
              className="btn-primary w-full mt-3 rounded-full py-2.5 text-xs uppercase tracking-[0.2em]"
            >
              Use this code
            </button>
          </form>
          <div className="text-[11px] text-[var(--sca-text-muted)] dark:text-white/55 mt-3 text-center">
            Point the camera at the QR label or type the SCA number manually.
          </div>
        </div>
      </div>
    </div>
  );
}
