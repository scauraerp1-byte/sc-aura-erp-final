import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Type, Search, Loader2, Package } from "lucide-react";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import api from "../lib/api";

/**
 * QR Scanner modal.
 *
 * Features:
 * - Camera QR scanning
 * - Manual SR search
 * - Type "SCA" and matching products appear
 * - Tap a product to continue
 * - Camera failure gracefully falls back to manual search
 */
export default function QRScanner({ open, onClose, onScan }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);

  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useBodyLock(open);
  useEscapeClose(onClose, open);

  /*
   * CAMERA
   */
  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    setError("");
    setManual("");
    setSearchResults([]);
    setSearching(false);

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
          {
            fps: 10,
            qrbox: {
              width: 240,
              height: 240,
            },
          },
          (text) => {
            try {
              scanner
                .stop()
                .then(() => scanner.clear())
                .catch(() => {});
            } catch {}

            onScan?.(
              String(text)
                .trim()
                .toUpperCase()
            );
          },
          () => {}
        )
        .catch((e) => {
          if (!cancelled) {
            setError(
              e?.message ||
                "Camera unavailable. Use manual search below."
            );
          }
        });
    }, 30);

    return () => {
      cancelled = true;
      clearTimeout(t);

      const s = scannerRef.current;

      if (s) {
        try {
          s.stop()
            .then(() => s.clear())
            .catch(() => {});
        } catch {}
      }

      scannerRef.current = null;
    };
  }, [open, onScan]);

  /*
   * MANUAL SR SEARCH
   *
   * Type:
   * SCA
   * SCA-0
   * SCA-00017
   *
   * and matching products will appear.
   */
  useEffect(() => {
    if (!open) return;

    const q = manual.trim().toUpperCase();

    setSearchResults([]);

    if (q.length < 2) {
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const { data } = await api.get(
          "/products",
          {
            params: {
              q,
            },
          }
        );

        if (!cancelled) {
          setSearchResults(
            Array.isArray(data)
              ? data.slice(0, 8)
              : []
          );
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [manual, open]);

  if (!open) return null;

  const selectProduct = (product) => {
    if (!product?.sr_number) return;

    onScan?.(
      String(product.sr_number)
        .trim()
        .toUpperCase()
    );
  };

  const submitManual = (e) => {
    e.preventDefault();

    const v = manual.trim().toUpperCase();

    if (v) {
      onScan?.(v);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Scan Product QR"
    >
      <div className="w-full max-w-md max-h-[92dvh] overflow-hidden rounded-2xl border border-white/15 bg-[#11151d] text-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#ebd281]">
              QR / SR Scanner
            </div>

            <div className="font-display text-xl mt-0.5 text-white">
              Scan Product QR
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="w-9 h-9 rounded-full grid place-items-center bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[calc(92dvh-80px)] overflow-y-auto p-4">
          {/* CAMERA */}
          <div
            id="qr-scanner-region"
            ref={containerRef}
            className="w-full overflow-hidden rounded-xl border border-white/10 bg-black aspect-square max-h-[48dvh]"
          />

          {error && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {error}
            </div>
          )}

          {/* MANUAL SEARCH */}
          <form
            onSubmit={submitManual}
            className="mt-4"
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">
              Or search by SR
            </div>

            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />

              <input
                autoFocus={!!error}
                value={manual}
                onChange={(e) =>
                  setManual(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Type SCA or SCA-00017"
                className="w-full h-11 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/35 px-10 pr-10 outline-none focus:border-[#d4af37]/60 focus:ring-1 focus:ring-[#d4af37]/30 uppercase font-mono-receipt"
                data-testid="qr-manual-input"
              />

              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebd281] animate-spin" />
              )}
            </div>
          </form>

          {/* SEARCH RESULTS */}
          {manual.trim().length >= 2 && (
            <div className="mt-3">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 px-1">
                    Matching products
                  </div>

                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        selectProduct(product)
                      }
                      className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.09] active:scale-[0.99] transition"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center">
                            <Package className="w-5 h-5 text-white/25" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono-receipt text-[#ebd281]">
                          {product.sr_number}
                        </div>

                        <div className="text-sm font-medium text-white truncate mt-0.5">
                          {product.title}
                        </div>

                        <div className="text-[10px] text-white/45 mt-1">
                          {product.category || ""}
                          {product.size_preset
                            ? ` · ${product.size_preset}`
                            : ""}
                        </div>
                      </div>

                      <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                !searching && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center">
                    <div className="text-sm text-white/65">
                      No product found
                    </div>

                    <div className="text-[10px] text-white/35 mt-1">
                      Try another SR number.
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* EXACT CODE BUTTON */}
          <button
            type="button"
            onClick={submitManual}
            disabled={!manual.trim()}
            data-testid="qr-manual-submit"
            className="btn-primary w-full mt-3 rounded-full py-2.5 text-xs uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Use this code
          </button>

          <div className="text-[11px] text-white/40 mt-3 text-center">
            Point the camera at the QR label or type
            an SR number such as SCA-00017.
          </div>
        </div>
      </div>
    </div>
  );
}
