import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  X,
  Type,
  Search,
  Loader2,
  Package,
} from "lucide-react";
import { useBodyLock } from "../hooks/useBodyLock";
import useEscapeClose from "../hooks/useEscapeClose";
import api from "../lib/api";
import { useTheme } from "../contexts/ThemeContext";

export default function QRScanner({
  open,
  onClose,
  onScan,
}) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);

  const { theme } = useTheme();
  const isLight = theme === "light";

  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useBodyLock(open);
  useEscapeClose(onClose, open);

  /* =========================================================
     CAMERA
  ========================================================= */

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    setError("");
    setManual("");
    setSearchResults([]);
    setSearching(false);

    const timer = setTimeout(() => {
      if (cancelled) return;

      const id = "qr-scanner-region";
      const element = document.getElementById(id);

      if (!element) return;

      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 220,
              height: 220,
            },
            aspectRatio: 1,
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
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);

      const scanner = scannerRef.current;

      if (scanner) {
        try {
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {});
        } catch {}
      }

      scannerRef.current = null;
    };
  }, [open, onScan]);

  /* =========================================================
     MANUAL SR SEARCH
  ========================================================= */

  useEffect(() => {
    if (!open) return;

    const query = manual.trim().toUpperCase();

    setSearchResults([]);

    if (query.length < 2) {
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;

      setSearching(true);

      try {
        const { data } = await api.get(
          "/products",
          {
            params: {
              q: query,
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

  const submitManual = (event) => {
    event.preventDefault();

    const value = manual.trim().toUpperCase();

    if (value) {
      onScan?.(value);
    }
  };

  const modalBg = isLight ? "#ffffff" : "#11151d";
  const mainText = isLight ? "#111827" : "#ffffff";
  const mutedText = isLight
    ? "#6b7280"
    : "rgba(255,255,255,0.50)";
  const border = isLight
    ? "#e5e7eb"
    : "rgba(255,255,255,0.12)";

  return (
    <>
      <style>
        {`
          [data-testid="qr-manual-input"]::placeholder {
            color: ${isLight ? "#6b7280" : "#94a3b8"};
            opacity: 1;
          }

          [data-testid="qr-manual-input"] {
            color: ${isLight ? "#111827" : "#ffffff"} !important;
            -webkit-text-fill-color: ${
              isLight ? "#111827" : "#ffffff"
            } !important;
          }
        `}
      </style>

      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Scan Product QR"
      >
        <div
          className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: modalBg,
            color: mainText,
            borderColor: border,
            maxHeight: "88dvh",
          }}
        >
          {/* HEADER */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{
              borderColor: border,
            }}
          >
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.28em]"
                style={{
                  color: isLight
                    ? "#9a7200"
                    : "#d4af37",
                }}
              >
                QR / SR Scanner
              </div>

              <div
                className="font-display text-xl mt-1"
                style={{
                  color: mainText,
                }}
              >
                Scan Product QR
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close scanner"
              className="w-10 h-10 rounded-full grid place-items-center border transition"
              style={{
                background: isLight
                  ? "#111827"
                  : "#ffffff",
                color: isLight
                  ? "#ffffff"
                  : "#111827",
                borderColor: isLight
                  ? "#111827"
                  : "#ffffff",
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CONTENT */}
          <div
            className="p-4"
            style={{
              maxHeight: "calc(88dvh - 78px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling:
                "touch",
            }}
          >
            {/* CAMERA */}
            <div
              id="qr-scanner-region"
              ref={containerRef}
              className="w-full overflow-hidden rounded-xl border bg-black"
              style={{
                height: "min(48vw, 260px)",
                minHeight: "210px",
                borderColor: isLight
                  ? "#d1d5db"
                  : "rgba(255,255,255,0.15)",
              }}
            />

            {error && (
              <div
                className="mt-3 rounded-xl px-3 py-2.5 text-xs"
                style={{
                  background:
                    "rgba(245,158,11,0.10)",
                  border:
                    "1px solid rgba(245,158,11,0.25)",
                  color: "#d97706",
                }}
              >
                {error}
              </div>
            )}

            {/* SEARCH LABEL */}
            <div
              className="text-[10px] uppercase tracking-[0.22em] mt-4 mb-2"
              style={{
                color: mutedText,
              }}
            >
              Or Search By SR
            </div>

            {/* SEARCH INPUT */}
            <form onSubmit={submitManual}>
              <div className="relative">
                <Type
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{
                    color: isLight
                      ? "#6b7280"
                      : "rgba(255,255,255,0.55)",
                  }}
                />

                <input
                  autoFocus={!!error}
                  value={manual}
                  onChange={(event) =>
                    setManual(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Type SCA or SCA-00017"
                  data-testid="qr-manual-input"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-12 rounded-xl pl-10 pr-10 outline-none font-mono-receipt uppercase"
                  style={{
                    background: isLight
                      ? "#f8fafc"
                      : "#20252d",
                    color: isLight
                      ? "#111827"
                      : "#ffffff",
                    caretColor: isLight
                      ? "#9a7200"
                      : "#ebd281",
                    border: isLight
                      ? "1px solid #d1d5db"
                      : "1px solid rgba(255,255,255,0.18)",
                  }}
                />

                {searching && (
                  <Loader2
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                    style={{
                      color: "#d4af37",
                    }}
                  />
                )}
              </div>
            </form>

            {/* MATCHING PRODUCTS */}
            {manual.trim().length >= 2 && (
              <div className="mt-3">
                <div
                  className="text-[10px] uppercase tracking-[0.22em] px-1 mb-2"
                  style={{
                    color: mutedText,
                  }}
                >
                  Matching Products
                </div>

                {searchResults.length > 0 ? (
                  <div
                    className="space-y-2"
                    style={{
                      maxHeight: "300px",
                      overflowY: "auto",
                      overscrollBehavior:
                        "contain",
                      paddingRight: "2px",
                    }}
                  >
                    {searchResults.map(
                      (product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() =>
                            selectProduct(product)
                          }
                          className="w-full flex items-center gap-3 rounded-xl text-left transition active:scale-[0.99]"
                          style={{
                            background: isLight
                              ? "#f8fafc"
                              : "#1b2029",
                            color: isLight
                              ? "#111827"
                              : "#ffffff",
                            border: isLight
                              ? "1px solid #e5e7eb"
                              : "1px solid rgba(255,255,255,0.10)",
                            padding:
                              "10px 12px",
                          }}
                        >
                          {/* IMAGE */}
                          <div
                            className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                            style={{
                              background:
                                isLight
                                  ? "#e5e7eb"
                                  : "rgba(255,255,255,0.05)",
                              border: isLight
                                ? "1px solid #d1d5db"
                                : "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            {product.images?.[0] ? (
                              <img
                                src={
                                  product.images[0]
                                }
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center">
                                <Package
                                  className="w-5 h-5"
                                  style={{
                                    color:
                                      isLight
                                        ? "#9ca3af"
                                        : "rgba(255,255,255,0.25)",
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* INFO */}
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[10px] font-mono-receipt font-semibold"
                              style={{
                                color: isLight
                                  ? "#9a7200"
                                  : "#ebd281",
                              }}
                            >
                              {product.sr_number}
                            </div>

                            <div
                              className="text-sm font-medium truncate mt-0.5"
                              style={{
                                color: isLight
                                  ? "#111827"
                                  : "#ffffff",
                              }}
                            >
                              {product.title}
                            </div>

                            <div
                              className="text-[10px] mt-1"
                              style={{
                                color: isLight
                                  ? "#6b7280"
                                  : "rgba(255,255,255,0.45)",
                              }}
                            >
                              {product.category || ""}
                              {product.size_preset
                                ? ` · ${product.size_preset}`
                                : ""}
                            </div>
                          </div>

                          <Search
                            className="w-5 h-5 flex-shrink-0"
                            style={{
                              color: isLight
                                ? "#9ca3af"
                                : "rgba(255,255,255,0.35)",
                            }}
                          />
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  !searching && (
                    <div
                      className="rounded-xl px-4 py-5 text-center"
                      style={{
                        background: isLight
                          ? "#f8fafc"
                          : "rgba(255,255,255,0.04)",
                        border: isLight
                          ? "1px solid #e5e7eb"
                          : "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <div
                        className="text-sm"
                        style={{
                          color: isLight
                            ? "#374151"
                            : "rgba(255,255,255,0.70)",
                        }}
                      >
                        No product found
                      </div>

                      <div
                        className="text-[10px] mt-1"
                        style={{
                          color: isLight
                            ? "#9ca3af"
                            : "rgba(255,255,255,0.35)",
                        }}
                      >
                        Try another SR number.
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* USE CODE */}
            <button
              type="button"
              onClick={submitManual}
              disabled={!manual.trim()}
              data-testid="qr-manual-submit"
              className="w-full rounded-full py-2.5 mt-3 text-xs uppercase tracking-[0.2em] font-medium transition"
              style={{
                background: manual.trim()
                  ? isLight
                    ? "#111827"
                    : "#ffffff"
                  : isLight
                  ? "#e5e7eb"
                  : "rgba(255,255,255,0.08)",
                color: manual.trim()
                  ? isLight
                    ? "#ffffff"
                    : "#11151d"
                  : isLight
                  ? "#9ca3af"
                  : "rgba(255,255,255,0.30)",
              }}
            >
              Use This Code
            </button>

            <div
              className="text-[10px] text-center mt-3 pb-1"
              style={{
                color: isLight
                  ? "#6b7280"
                  : "rgba(255,255,255,0.38)",
              }}
            >
              Point the camera at the QR label or
              type an SR number such as SCA-00017.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
