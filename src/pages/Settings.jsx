import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { useBranding } from "../contexts/BrandingContext";
import { GlassCard, SectionTitle } from "../components/Primitives";
import { Loader2, Save, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const { branding, refresh } = useBranding();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (branding) setForm(branding);
  }, [branding]);
  // Emergency fallback: if branding never resolves (unlikely), show an
  // empty editable form after 4s so Settings never stays as a shimmer.
  useEffect(() => {
    const t = setTimeout(() => setForm((f) => f || { company_name: "", gst: "", address: "", phone: "", whatsapp: "", accent_color: "", logo_url: "" }), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!form) return <div className="h-40 rounded-2xl shimmer" />;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await api.patch("/branding", form);
      await refresh();
      setSaved(true); setTimeout(() => setSaved(false), 2400);
    } catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  const onPickLogo = async (file) => {
    if (!file) return;
    const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
    update("logo_url", dataUrl);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionTitle overline="Admin" title="Branding & Settings" />

      <form onSubmit={submit} className="space-y-4">
        <GlassCard>
          <div className="grid sm:grid-cols-[120px_1fr] gap-4 items-center">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 grid place-items-center border border-white/10">
              {form.logo_url ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" /> : <div className="text-white/30 text-xs">No logo</div>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Company logo</div>
              <label className="inline-flex items-center gap-2 rounded-full glass px-5 py-2 text-xs uppercase tracking-[0.2em] cursor-pointer hover:bg-white/10">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickLogo(e.target.files?.[0])} data-testid="branding-logo" />
              </label>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Company name" v={form.company_name} onChange={(v) => update("company_name", v)} testid="branding-name" />
            <Field label="GST number" v={form.gst} onChange={(v) => update("gst", v)} />
            <Field label="Address" v={form.address} onChange={(v) => update("address", v)} className="sm:col-span-2" />
            <Field label="Phone" v={form.phone} onChange={(v) => update("phone", v)} />
            <Field label="WhatsApp" v={form.whatsapp} onChange={(v) => update("whatsapp", v)} />
            <Field label="Accent color (hex)" v={form.accent_color} onChange={(v) => update("accent_color", v)} placeholder="#d4af37" />
          </div>
        </GlassCard>

        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

        <div className="flex items-center justify-end gap-3">
          {saved && <div className="text-emerald-400 text-xs inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</div>}
          <button data-testid="branding-save" disabled={busy} className="btn-primary rounded-full px-7 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, v, onChange, className = "", testid, placeholder }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-white/60 mb-1.5 inline-block">{label}</span>
      <input data-testid={testid} value={v || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="aura-input" />
    </label>
  );
}
