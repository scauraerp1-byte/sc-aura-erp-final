import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { Printer, Share2 } from "lucide-react";
import { shareWhatsApp, publicBookingUrl, publicDispatchUrl, formatRupee } from "../lib/share";

export default function PublicReceipt({ kind }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE}/public/receipt/${kind}/${id}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.detail || "Not found"));
  }, [kind, id]);

  if (err) return <div className="min-h-screen bg-black text-white grid place-items-center"><div className="glass rounded-3xl p-8 text-center">{err}</div></div>;
  if (!data) return <div className="min-h-screen bg-black grid place-items-center"><div className="font-display text-sm text-white/50 uppercase tracking-[0.3em]">Loading…</div></div>;

  const branding = data.branding;

  return kind === "booking"
    ? <BookingView booking={data.booking} branding={branding} />
    : <DispatchView dispatch={data.dispatch} branding={branding} />;
}

function BookingView({ booking, branding }) {
  const totalPieces = booking.items.reduce((s, it) => s + Object.values(it.sizes).reduce((a, b) => a + b, 0), 0);
  const phone = booking.customer_snapshot?.phone || "";
  const share = () => {
    const text = `*${branding.company_name}* — Booking Receipt\n\nBooking: ${booking.booking_no}\nDate: ${new Date(booking.created_at).toLocaleDateString()}\nFor: ${booking.customer_snapshot?.name} (${booking.customer_snapshot?.shop_name || ""})\nTotal pieces: ${totalPieces}\nAmount: ${formatRupee(booking.booking_amount)}\n\nView full receipt → ${publicBookingUrl(booking.id)}`;
    shareWhatsApp({ phone, text });
  };

  return (
    <PublicReceiptShell branding={branding} share={share}>
      <div className="receipt">
        {branding.logo_url && <img src={branding.logo_url} alt="" style={{ width: 60, margin: "0 auto", display: "block" }} />}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <b>{branding.company_name}</b>
          <div style={{ fontSize: 11 }}>{branding.address}</div>
          <div style={{ fontSize: 11 }}>{branding.phone} · {branding.gst}</div>
        </div>
        <hr />
        <div style={{ fontSize: 12 }}>
          <div><b>Booking:</b> {booking.booking_no}</div>
          <div><b>Date:</b> {new Date(booking.created_at).toLocaleString()}</div>
          <div><b>Customer:</b> {booking.customer_snapshot?.name}</div>
          <div>{booking.customer_snapshot?.shop_name}</div>
          <div>{booking.customer_snapshot?.phone}</div>
          <div><b>Status:</b> {String(booking.status).toUpperCase()}</div>
        </div>
        <hr />
        <table style={{ width: "100%", fontSize: 11 }}>
          <thead><tr style={{ borderBottom: "1px dashed #aaa" }}><th style={{ textAlign: "left" }}>SR · Item</th><th style={{ textAlign: "right" }}>Qty</th></tr></thead>
          <tbody>
            {booking.items.map((it, i) => {
              const q = Object.values(it.sizes).reduce((a, b) => a + b, 0);
              return (
                <tr key={i}>
                  <td style={{ padding: "4px 0" }}>{it.sr_number}<br /><span style={{ fontSize: 10 }}>{it.title}</span><br /><span style={{ fontSize: 10 }}>{Object.entries(it.sizes).map(([s, n]) => `${s}:${n}`).join(" ")}</span></td>
                  <td style={{ textAlign: "right", verticalAlign: "top" }}>{q}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <hr />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span><b>Total Pcs</b></span><span>{totalPieces}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span><b>Amount</b></span><span>{formatRupee(booking.booking_amount)}</span></div>
        <hr />
        <div style={{ textAlign: "center", fontSize: 10 }}>Thank you · Visit again<br />{branding.whatsapp && `WA ${branding.whatsapp}`}</div>
      </div>
    </PublicReceiptShell>
  );
}

function DispatchView({ dispatch, branding }) {
  const totalPieces = dispatch.items.reduce((s, it) => s + Object.values(it.sizes).reduce((a, b) => a + b, 0), 0);
  const phone = dispatch.phone;
  const share = () => {
    const text = `*${branding.company_name}* — Dispatch Note\n\nDispatch: ${dispatch.dispatch_no}\nTo: ${dispatch.dispatch_to}\nTransport: ${dispatch.transport || "—"}\nTotal pieces: ${totalPieces}\nStatus: ${dispatch.status}\n\nView full receipt → ${publicDispatchUrl(dispatch.id)}`;
    shareWhatsApp({ phone, text });
  };
  return (
    <PublicReceiptShell branding={branding} share={share}>
      <div className="receipt">
        {branding.logo_url && <img src={branding.logo_url} alt="" style={{ width: 60, margin: "0 auto", display: "block" }} />}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <b>{branding.company_name}</b>
          <div style={{ fontSize: 11 }}>{branding.address}</div>
          <div style={{ fontSize: 11 }}>{branding.phone} · {branding.gst}</div>
        </div>
        <hr />
        <div style={{ fontSize: 12 }}>
          <div><b>Dispatch:</b> {dispatch.dispatch_no}</div>
          <div><b>Date:</b> {new Date(dispatch.created_at).toLocaleString()}</div>
          <div><b>To:</b> {dispatch.dispatch_to}</div>
          <div>{dispatch.phone}</div>
          <div><b>Transport:</b> {dispatch.transport || "—"}</div>
          <div><b>Status:</b> {String(dispatch.status).toUpperCase()}</div>
        </div>
        <hr />
        <table style={{ width: "100%", fontSize: 11 }}>
          <thead><tr style={{ borderBottom: "1px dashed #aaa" }}><th style={{ textAlign: "left" }}>SR · Item</th><th style={{ textAlign: "right" }}>Qty</th></tr></thead>
          <tbody>
            {dispatch.items.map((it, i) => {
              const q = Object.values(it.sizes).reduce((a, b) => a + b, 0);
              return (
                <tr key={i}>
                  <td style={{ padding: "4px 0" }}>{it.sr_number}<br /><span style={{ fontSize: 10 }}>{it.title}</span><br /><span style={{ fontSize: 10 }}>{Object.entries(it.sizes).map(([s, n]) => `${s}:${n}`).join(" ")}</span></td>
                  <td style={{ textAlign: "right", verticalAlign: "top" }}>{q}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <hr />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span><b>Total Pcs</b></span><span>{totalPieces}</span></div>
      </div>
    </PublicReceiptShell>
  );
}

function PublicReceiptShell({ children, branding, share }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 bg-black/70 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {branding.logo_url ? <img src={branding.logo_url} alt="" className="w-9 h-9 rounded-full ring-1 ring-[#d4af37]/40" /> : null}
          <div className="font-display text-sm">{branding.company_name}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={share} className="rounded-full glass px-4 py-2 text-[11px] uppercase tracking-[0.2em] inline-flex items-center gap-2 hover:bg-white/10"><Share2 className="w-3.5 h-3.5" />Share</button>
          <button onClick={() => window.print()} className="rounded-full glass px-4 py-2 text-[11px] uppercase tracking-[0.2em] inline-flex items-center gap-2 hover:bg-white/10"><Printer className="w-3.5 h-3.5" />Print</button>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
