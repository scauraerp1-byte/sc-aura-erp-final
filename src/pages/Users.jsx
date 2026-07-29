import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { Plus, X, Loader2, Key, Edit3, Trash2, Power, PowerOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import FilterBar from "../components/FilterBar";
import { useAuth } from "../contexts/AuthContext";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "super_staff", label: "Super Staff" },
];

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [modal, setModal] = useState(null);

  const load = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== "All" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  const toggleEnabled = async (u) => {
    if (u.id === me.id) return toast.error("You cannot disable your own account.");
    setBusy(true);
    try {
      await api.patch(`/users/${u.id}`, { enabled: !(u.enabled !== false) });
      toast.success(`User ${u.enabled === false ? "enabled" : "disabled"}`);
      load();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  const removeUser = async (u) => {
    if (u.id === me.id) return toast.error("You cannot delete your own account.");
    if (!window.confirm(`Delete user ${u.email}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        overline="Access"
        title="User Management"
        action={
          <button data-testid="user-add" onClick={() => setModal({ mode: "create" })} className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add User
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        filters={[
          {
            key: "role",
            label: "Role",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [{ value: "All", label: "All" }, ...ROLES.map((r) => ({ value: r.value, label: r.label }))],
          },
        ]}
      />

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-white/50">No users match.</td></tr>}
              {filtered.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.email}`} className="border-b border-white/5 hover:bg-white/[0.04]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center text-black text-xs font-semibold">
                        {(u.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                      {u.id === me.id && <Pill tone="gold">You</Pill>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/70">{u.email}</td>
                  <td className="px-5 py-3">
                    <Pill tone={u.role === "admin" ? "gold" : u.role === "manager" ? "success" : "default"}>{u.role.replace("_", " ")}</Pill>
                  </td>
                  <td className="px-5 py-3">
                    {u.enabled === false ? <Pill tone="danger">Disabled</Pill> : <Pill tone="success">Active</Pill>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button data-testid={`user-reset-${u.email}`} title="Reset password" onClick={() => setModal({ mode: "reset", user: u })} className="w-8 h-8 rounded-full glass grid place-items-center hover:bg-white/10"><Key className="w-3.5 h-3.5 text-[#ebd281]" /></button>
                      <button data-testid={`user-edit-${u.email}`} title="Edit" onClick={() => setModal({ mode: "edit", user: u })} className="w-8 h-8 rounded-full glass grid place-items-center hover:bg-white/10"><Edit3 className="w-3.5 h-3.5 text-white/70" /></button>
                      <button data-testid={`user-toggle-${u.email}`} title={u.enabled === false ? "Enable" : "Disable"} disabled={busy || u.id === me.id} onClick={() => toggleEnabled(u)} className="w-8 h-8 rounded-full glass grid place-items-center hover:bg-white/10">
                        {u.enabled === false ? <Power className="w-3.5 h-3.5 text-emerald-400" /> : <PowerOff className="w-3.5 h-3.5 text-amber-300" />}
                      </button>
                      <button data-testid={`user-delete-${u.email}`} title="Delete" disabled={busy || u.id === me.id} onClick={() => removeUser(u)} className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 grid place-items-center hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-300" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {modal && (
        <UserModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

function UserModal({ modal, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: modal.user?.name || "",
    email: modal.user?.email || "",
    password: "",
    role: modal.user?.role || "staff",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = modal.mode === "create" ? "Add User" : modal.mode === "edit" ? "Edit User" : "Reset Password";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (modal.mode === "create") {
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters");
        await api.post("/users", form);
        toast.success("User created");
      } else if (modal.mode === "edit") {
        await api.patch(`/users/${modal.user.id}`, { name: form.name, role: form.role });
        toast.success("User updated");
      } else if (modal.mode === "reset") {
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters");
        await api.post(`/users/${modal.user.id}/reset-password`, { new_password: form.password });
        toast.success("Password reset");
      }
      onSaved();
    } catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <form onSubmit={submit} className="glass-strong rounded-3xl p-6 w-full max-w-md fade-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Access</div>
            <h3 className="font-display text-2xl">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {modal.mode !== "reset" && (
            <>
              <label className="block">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Full name</span>
                <input data-testid="user-form-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="aura-input" />
              </label>
              <label className="block">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Email</span>
                <input data-testid="user-form-email" type="email" required disabled={modal.mode === "edit"} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="aura-input disabled:opacity-60" />
              </label>
              <label className="block">
                <span className="text-xs text-white/60 mb-1.5 inline-block">Role</span>
                <select data-testid="user-form-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="aura-input">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
            </>
          )}
          {(modal.mode === "create" || modal.mode === "reset") && (
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">{modal.mode === "reset" ? "New password" : "Password"} (min 6 chars)</span>
              <input data-testid="user-form-password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="aura-input" />
            </label>
          )}
        </div>

        {error && <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">{error}</div>}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
          <button data-testid="user-form-submit" disabled={busy} className="btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} <ShieldCheck className="w-4 h-4" /> Save
          </button>
        </div>
      </form>
    </div>
  );
}
