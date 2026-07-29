import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => { if (!loading && user) navigate("/"); }, [user, loading, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    if (!email.trim() || !password) { setError("Please enter both email and password."); setBusy(false); return; }
    const r = await login(email, password);
    setBusy(false);
    if (!r.ok) { setError(r.error); toast.error(r.error); }
    else { toast.success("Welcome back"); navigate("/"); }
  };

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 bg-black text-white">
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-[#161109] via-black to-[#0a0a0a]">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(700px 500px at 20% 20%, rgba(212,175,55,0.18), transparent 60%), radial-gradient(800px 600px at 90% 90%, rgba(212,175,55,0.12), transparent 60%)"
        }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center font-display text-black text-lg font-semibold">SC</div>
          <div>
            <div className="font-display text-2xl">SC Aura Kurtis</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Wholesale ERP</div>
          </div>
        </div>
        <div className="relative z-10 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Operating system for fashion wholesale</div>
          <h1 className="font-display text-4xl xl:text-5xl tracking-tight leading-tight">
            Inventory. Bookings.<br/>Dispatch — in <span className="gold-text">one elegant flow.</span>
          </h1>
          <p className="text-sm text-white/60 max-w-md">QR-driven dispatch, customer memory, fast-selling intelligence — built for kurti wholesalers who move fast.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-black">
        <form onSubmit={submit} className="w-full max-w-md glass-strong rounded-3xl p-8 fade-up" data-testid="login-form">
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center font-display text-black font-semibold">SC</div>
            <div>
              <div className="font-display text-lg">SC Aura Kurtis</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Wholesale ERP</div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281] mb-1">Welcome back</div>
          <h2 className="font-display text-3xl tracking-tight mb-6">Sign in to <span className="text-white">SC Aura</span></h2>

          <label className="block mb-3">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Email</span>
            <input data-testid="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="aura-input" placeholder="you@company.com" />
          </label>
          <label className="block mb-4">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Password</span>
            <div className="relative">
              <input data-testid="login-password" type={show ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="aura-input pr-12" placeholder="••••••••" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between mb-6 text-xs">
            <label className="flex items-center gap-2 text-white/60 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[#d4af37]" />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              data-testid="forgot-password"
              onClick={() => setForgotOpen(true)}
              className="text-[#ebd281]/80 hover:text-[#ebd281]"
            >
              Forgot password?
            </button>
          </div>

          {error && <div data-testid="login-error" className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

          <button data-testid="login-submit" type="submit" disabled={busy} className="btn-primary w-full rounded-full py-3 text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>

          <div className="mt-6 pt-6 border-t border-white/10 text-[11px] text-white/40 text-center">
            Contact your admin if you need access.
          </div>
        </form>
      </div>

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} defaultEmail={email} />}
    </div>
  );
}

function ForgotPasswordModal({ onClose, defaultEmail }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState("request"); // request | reset | done
  const [error, setError] = useState("");

  const requestReset = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If the email exists, a reset code has been generated.");
      setStep("reset");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const doReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setBusy(true); setError("");
    try {
      await api.post("/auth/reset-password", { token: token.trim(), new_password: newPassword });
      setStep("done");
      toast.success("Password reset successfully");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md grid place-items-center p-4">
      <div className="glass-strong rounded-3xl p-6 w-full max-w-md fade-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Recover access</div>
            <h3 className="font-display text-2xl mt-0.5">Reset password</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white" data-testid="forgot-close">✕</button>
        </div>

        {step === "request" && (
          <form onSubmit={requestReset} className="space-y-3">
            <p className="text-sm text-white/60">Enter your account email. Your admin will receive the reset code, or the code will appear in your app logs for local setup.</p>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Email</span>
              <input data-testid="forgot-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="aura-input" />
            </label>
            {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
              <button data-testid="forgot-submit" disabled={busy} className="btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send code
              </button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={doReset} className="space-y-3">
            <p className="text-sm text-white/60">Enter the reset token you received and choose a new password.</p>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Reset code / token</span>
              <input data-testid="reset-token" required value={token} onChange={(e) => setToken(e.target.value)} className="aura-input font-mono-receipt" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">New password (min 6 chars)</span>
              <input data-testid="reset-new-password" required type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="aura-input" />
            </label>
            {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">{error}</div>}
            <div className="flex gap-2 justify-between items-center">
              <button type="button" onClick={() => setStep("request")} className="text-xs text-white/50 inline-flex items-center gap-1 hover:text-white"><ArrowLeft className="w-3 h-3" /> Back</button>
              <button data-testid="reset-submit" disabled={busy} className="btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Reset password
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
            <div className="font-display text-xl">Password updated</div>
            <div className="text-sm text-white/60 mt-1 mb-4">Sign in with your new password.</div>
            <button onClick={onClose} className="btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em]">Sign in</button>
          </div>
        )}
      </div>
    </div>
  );
}
