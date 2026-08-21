import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle } from "../components/Primitives";
import { SizePresetSelector, PRESETS } from "../components/SizeWidgets";
import {
  Loader2,
  Image as ImageIcon,
  Camera,
  X,
  Minus,
  Plus,
} from "lucide-react";

const CATEGORIES = ["1 PC", "2 PC", "3 PC"];

export default function ProductForm() {
  const navigate = useNavigate();

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "1 PC",
    size_preset: "M-XXL",
    quantity: 12,
    price: 0,
    notes: "",
    factory_name: "",
    images: [],
    stock_by_size: {},
  });

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [distributionOpen, setDistributionOpen] = useState(false);
  const [baseQuantity, setBaseQuantity] = useState(0);
  const [extraQuantity, setExtraQuantity] = useState(0);
  const [extraDistribution, setExtraDistribution] = useState({});

  const update = (k, v) => {
    setForm((f) => ({
      ...f,
      [k]: v,
    }));
  };

  const removeImage = (idx) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));
  };

  const onPickImages = async (files) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) return;

    setUploading(true);
    setError("");

    const uploaded = [];

    try {
      for (const file of fileList) {
        const body = new FormData();

        body.append(
          "file",
          file,
          file.name || "product-image"
        );

        const { data } = await api.post(
          "/uploads",
          body
        );

        if (!data?.url) {
          throw new Error(
            "Image upload failed. Server did not return an image URL."
          );
        }

        /*
         * Backend returns:
         * /api/uploads/filename.webp
         *
         * Convert it into the actual current ERP URL.
         */
        const imageUrl = data.url.startsWith("http")
          ? data.url
          : `https://erp.scaurakurtis.com${data.url}`;

        uploaded.push(imageUrl);
      }

      setForm((f) => ({
        ...f,
        images: [...f.images, ...uploaded],
      }));
    } catch (err) {
      console.error("IMAGE UPLOAD ERROR:", err);

      setError(
        formatApiError(err.response?.data?.detail) ||
          err.response?.data?.message ||
          err.message ||
          "Something went wrong while uploading image."
      );
    } finally {
      setUploading(false);

      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }

      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  const calculateDistribution = (quantityValue) => {
    const quantity = Number(quantityValue) || 0;
    const sizes = PRESETS[form.size_preset] || [];

    if (!sizes.length) {
      setBaseQuantity(0);
      setExtraQuantity(0);
      setExtraDistribution({});
      setDistributionOpen(false);

      setForm((f) => ({
        ...f,
        stock_by_size: {},
      }));

      return;
    }

    const base = Math.floor(quantity / sizes.length);
    const remainder = quantity % sizes.length;

    setBaseQuantity(base);
    setExtraQuantity(remainder);

    const baseStock = {};

    sizes.forEach((size) => {
      baseStock[size] = base;
    });

    if (remainder === 0) {
      setExtraDistribution({});
      setDistributionOpen(false);

      setForm((f) => ({
        ...f,
        stock_by_size: baseStock,
      }));

      return;
    }

    const extras = {};

    sizes.forEach((size) => {
      extras[size] = 0;
    });

    setExtraDistribution(extras);

    setForm((f) => ({
      ...f,
      stock_by_size: baseStock,
    }));

    setDistributionOpen(true);
  };

  const handleQuantityBlur = (e) => {
    calculateDistribution(e.target.value);
  };

  const handleSizePresetChange = (value) => {
    const quantity = Number(form.quantity) || 0;
    const sizes = PRESETS[value] || [];

    update("size_preset", value);

    if (!sizes.length) {
      setBaseQuantity(0);
      setExtraQuantity(0);
      setExtraDistribution({});
      setDistributionOpen(false);

      setForm((f) => ({
        ...f,
        size_preset: value,
        stock_by_size: {},
      }));

      return;
    }

    const base = Math.floor(quantity / sizes.length);
    const remainder = quantity % sizes.length;

    const baseStock = {};

    sizes.forEach((size) => {
      baseStock[size] = base;
    });

    setBaseQuantity(base);
    setExtraQuantity(remainder);

    if (remainder === 0) {
      setExtraDistribution({});
      setDistributionOpen(false);

      setForm((f) => ({
        ...f,
        size_preset: value,
        stock_by_size: baseStock,
      }));
    } else {
      const extras = {};

      sizes.forEach((size) => {
        extras[size] = 0;
      });

      setExtraDistribution(extras);

      setForm((f) => ({
        ...f,
        size_preset: value,
        stock_by_size: baseStock,
      }));

      setDistributionOpen(true);
    }
  };

  const increaseExtra = (size) => {
    const currentTotal = Object.values(
      extraDistribution
    ).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

    if (currentTotal >= extraQuantity) return;

    setExtraDistribution((current) => ({
      ...current,
      [size]: Number(current[size] || 0) + 1,
    }));
  };

  const decreaseExtra = (size) => {
    setExtraDistribution((current) => ({
      ...current,
      [size]: Math.max(
        0,
        Number(current[size] || 0) - 1
      ),
    }));
  };

  const extraDistributed = Object.values(
    extraDistribution
  ).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const remainingExtra =
    extraQuantity - extraDistributed;

  const confirmDistribution = () => {
    if (remainingExtra !== 0) return;

    const sizes = PRESETS[form.size_preset] || [];
    const finalStock = {};

    sizes.forEach((size) => {
      finalStock[size] =
        baseQuantity +
        Number(extraDistribution[size] || 0);
    });

    const finalTotal = Object.values(
      finalStock
    ).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

    if (finalTotal !== Number(form.quantity)) {
      setError(
        "Size-wise quantities must exactly match total quantity."
      );
      return;
    }

    setForm((f) => ({
      ...f,
      stock_by_size: finalStock,
    }));

    setDistributionOpen(false);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (uploading) {
      setError(
        "Please wait for images to finish uploading."
      );
      return;
    }

    const quantity = Number(form.quantity) || 0;
    const sizes = PRESETS[form.size_preset] || [];

    if (extraQuantity > 0 && distributionOpen) {
      setError(
        `Please distribute all ${extraQuantity} extra piece${
          extraQuantity === 1 ? "" : "s"
        } before saving.`
      );
      return;
    }

    const stockTotal = Object.values(
      form.stock_by_size || {}
    ).reduce(
      (sum, value) => sum + Number(value || 0),
      0
    );

    if (stockTotal !== quantity) {
      setError(
        "Size-wise quantities must exactly match total quantity."
      );
      return;
    }

    if (
      sizes.some(
        (size) =>
          form.stock_by_size?.[size] === undefined
      )
    ) {
      setError(
        "Please complete the size-wise quantity distribution."
      );
      return;
    }

    setBusy(true);

    try {
      const payload = {
        ...form,
        quantity,
        price: Number(form.price),
        stock_by_size: form.stock_by_size,
      };

      const { data } = await api.post(
        "/products",
        payload
      );

      navigate(`/products/${data.id}`);
    } catch (err) {
      setError(
        formatApiError(err.response?.data?.detail) ||
          err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const sizes = PRESETS[form.size_preset] || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SectionTitle
        overline="Inventory"
        title="Add Product"
      />

      <form onSubmit={submit} className="space-y-4">
        <GlassCard>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs text-white/60 mb-1.5 inline-block">
                Product title
              </span>

              <input
                data-testid="product-title"
                required
                value={form.title}
                onChange={(e) =>
                  update("title", e.target.value)
                }
                className="aura-input"
                placeholder="e.g. Royal Bandhani 3PC Set"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs text-white/60 mb-1.5 inline-block">
                Description
              </span>

              <textarea
                data-testid="product-description"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  update(
                    "description",
                    e.target.value
                  )
                }
                className="aura-input"
                placeholder="Short product description…"
              />
            </label>

            <div>
              <span className="text-xs text-white/60 mb-1.5 inline-block">
                Category
              </span>

              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    data-testid={`cat-${c}`}
                    onClick={() =>
                      update("category", c)
                    }
                    className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-full text-xs uppercase tracking-[0.2em] border transition-colors ${
                      form.category === c
                        ? "bg-[var(--sca-primary)] text-white border-[var(--sca-primary)]"
                        : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">
                Price (₹)
              </span>

              <input
                data-testid="product-price"
                required
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  update("price", e.target.value)
                }
                className="aura-input"
              />
            </label>

            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">
                Total quantity
              </span>

              <input
                data-testid="product-quantity"
                required
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) =>
                  update(
                    "quantity",
                    e.target.value
                  )
                }
                onBlur={handleQuantityBlur}
                className="aura-input"
              />
            </label>

            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">
                Factory name (internal only)
              </span>

              <input
                data-testid="product-factory"
                value={form.factory_name}
                onChange={(e) =>
                  update(
                    "factory_name",
                    e.target.value
                  )
                }
                className="aura-input"
                placeholder="Surat Mills"
              />
            </label>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">
            Size range preset
          </div>

          <SizePresetSelector
            value={form.size_preset}
            onChange={handleSizePresetChange}
          />

          <div className="mt-3 text-xs text-white/50">
            Includes:{" "}
            <span className="text-white/80">
              {sizes.join(" · ")}
            </span>
          </div>

          {sizes.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
                Size-wise quantity
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sizes.map((size) => (
                  <div
                    key={size}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      {size}
                    </div>

                    <div className="text-lg font-semibold text-white mt-0.5">
                      {form.stock_by_size?.[size] ??
                        0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">
            Images
          </div>

          <input
            ref={galleryInputRef}
            data-testid="product-images-gallery"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) =>
              onPickImages(e.target.files)
            }
          />

          <input
            ref={cameraInputRef}
            data-testid="product-images-camera"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) =>
              onPickImages(e.target.files)
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                galleryInputRef.current?.click()
              }
              disabled={uploading}
              className="min-h-[120px] border border-dashed border-white/15 rounded-2xl p-5 text-center cursor-pointer hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-6 h-6 mx-auto text-white/40 mb-2" />

              <div className="text-sm text-white/70">
                Gallery
              </div>

              <div className="text-[10px] text-white/40 mt-1">
                Select multiple images
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                cameraInputRef.current?.click()
              }
              disabled={uploading}
              className="min-h-[120px] border border-dashed border-white/15 rounded-2xl p-5 text-center cursor-pointer hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-6 h-6 mx-auto text-white/40 mb-2" />

              <div className="text-sm text-white/70">
                Camera
              </div>

              <div className="text-[10px] text-white/40 mt-1">
                Take a product photo
              </div>
            </button>
          </div>

          {uploading && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/50">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading image…
            </div>
          )}

          {form.images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3">
              {form.images.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-white/5"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                      console.error(
                        "IMAGE PREVIEW FAILED:",
                        src
                      );
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-black/70 text-white/80 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">
              Internal notes
            </span>

            <textarea
              data-testid="product-notes"
              rows={2}
              value={form.notes}
              onChange={(e) =>
                update("notes", e.target.value)
              }
              className="aura-input"
              placeholder="Optional notes for inventory team…"
            />
          </label>
        </GlassCard>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full glass px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            data-testid="product-submit"
            disabled={
              busy ||
              uploading ||
              (extraQuantity > 0 &&
                distributionOpen)
            }
            className="btn-primary rounded-full px-8 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2"
          >
            {busy && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}

            Save Product
          </button>
        </div>
      </form>

      {distributionOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11151d] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                Size Distribution
              </div>

              <h2 className="text-xl font-semibold text-white mt-2">
                Distribute {extraQuantity} Extra{" "}
                {extraQuantity === 1
                  ? "Piece"
                  : "Pieces"}
              </h2>

              <p className="text-sm text-white/50 mt-2">
                Equal quantity is{" "}
                <span className="text-white/80">
                  {baseQuantity}
                </span>{" "}
                per size. Select where the extra pieces
                belong.
              </p>
            </div>

            <div className="p-6 space-y-3">
              {sizes.map((size) => (
                <div
                  key={size}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {size}
                    </div>

                    <div className="text-[10px] text-white/40 mt-0.5">
                      Base: {baseQuantity}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        decreaseExtra(size)
                      }
                      disabled={
                        Number(
                          extraDistribution[size] ||
                            0
                        ) <= 0
                      }
                      className="w-9 h-9 rounded-full border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:bg-white/10 disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="w-10 text-center text-white font-semibold">
                      {extraDistribution[size] ||
                        0}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        increaseExtra(size)
                      }
                      disabled={remainingExtra <= 0}
                      className="w-9 h-9 rounded-full border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:bg-white/10 disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div
                className={`mt-4 rounded-2xl px-4 py-3 border ${
                  remainingExtra === 0
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">
                    Remaining
                  </span>

                  <span
                    className={`font-semibold ${
                      remainingExtra === 0
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`}
                  >
                    {remainingExtra}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDistributionOpen(false)
                }
                className="rounded-full glass px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={remainingExtra !== 0}
                onClick={confirmDistribution}
                className="btn-primary rounded-full px-6 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Distribution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
