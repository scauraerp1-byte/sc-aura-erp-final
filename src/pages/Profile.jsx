import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle } from "../components/Primitives";
import { Loader2, Save, KeyRound, Sun, Moon, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [busy, setBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const navigate = useNavigate();

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch("/users/me/profile", { name });
      toast.success("Profile updated");
      refreshUser?.();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (newPassword !== confirmNew) return toast.error("Passwords do not match");
    setPwdBusy(true);
    try {
      await api.post("/users/me/change-password", { current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed");
      setCurrentPassword(""); setNewPassword(""); setConfirmNew("");
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setPwdBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionTitle overline="Account" title="My Profile" />

      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center text-black text-xl font-display font-semibold">
            {(user?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl truncate">{user?.name}</div>
            <div className="text-xs text-white/60 truncate">{user?.email}</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#ebd281] mt-0.5">{(user?.role || "").replace("_", " ")}</div>
          </div>
        </div>
      </GlassCard>

      <form onSubmit={saveProfile}>
        <GlassCard>
          <SectionTitle overline="Personal" title="Profile details" />
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Full name</span>
            <input data-testid="profile-name" required value={name} onChange={(e) => setName(e.target.value)} className="aura-input" />
          </label>
          <label className="block mt-3">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Email (username)</span>
            <input value={user?.email || ""} disabled className="aura-input opacity-60" />
            <span className="text-[10px] text-white/40 mt-1 inline-block">Ask your admin to change your email.</span>
          </label>
          <div className="flex justify-end mt-4">
            <button data-testid="profile-save" disabled={busy} className="btn-gold rounded-full px-6 py-3 text-xs uppercase tracking-[0.22em] inline-flex items-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </GlassCard>
      </form>

      <GlassCard>
        <SectionTitle overline="Appearance" title="Theme" />
        <div className="grid grid-cols-2 gap-3">
          <button
            data-testid="theme-dark"
            onClick={() => setTheme("dark")}
            className={`rounded-2xl p-4 text-left border transition ${theme === "dark" ? "border-[#d4af37] bg-[#d4af37]/10" : "border-white/10 hover:bg-white/5"}`}
          >
            <Moon className="w-5 h-5 text-[#ebd281] mb-2" />
            <div className="font-display">Dark</div>
            <div className="text-xs text-white/50">Optimised for late shop hours & mobile</div>
          </button>
          <button
            data-testid="theme-light"
            onClick={() => setTheme("light")}
            className={`rounded-2xl p-4 text-left border transition ${theme === "light" ? "border-[#d4af37] bg-[#d4af37]/10" : "border-white/10 hover:bg-white/5"}`}
          >
            <Sun className="w-5 h-5 text-[#ebd281] mb-2" />
            <div className="font-display">Light</div>
            <div className="text-xs text-white/50">Bright, high-contrast for daytime desks</div>
          </button>
        </div>
      </GlassCard>

      <form onSubmit={changePassword}>
        <GlassCard>
          <SectionTitle overline="Security" title="Change password" />
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Current</span>
              <input data-testid="profile-current-password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">New</span>
              <input data-testid="profile-new-password" type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Confirm new</span>
              <input data-testid="profile-confirm-password" type="password" required minLength={6} value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} className="aura-input" />
            </label>
          </div>
          <div className="flex justify-end mt-4">
            <button data-testid="profile-change-password" disabled={pwdBusy} className="btn-gold rounded-full px-6 py-3 text-xs uppercase tracking-[0.22em] inline-flex items-center gap-2">
              {pwdBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Change password
            </button>
          </div>
        </GlassCard>
      </form>

      <GlassCard>
        <SectionTitle overline="Session" title="Sign out" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-white/60">Signing out will end this session on this device.</div>
          <button onClick={async () => { await logout(); navigate("/login"); }} data-testid="profile-logout" className="rounded-full bg-red-500/10 border border-red-500/30 text-red-200 px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-red-500/20 inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
