import React, { useEffect, useState } from 'react';
import { KeyRound, Users, UserPlus, CheckCircle, RotateCcw, Ban, UserCheck } from 'lucide-react';
import { api, ROLES } from './api';

const MIN_PASSWORD_LENGTH = 12;

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#5ABBCE] focus:border-[#5ABBCE] outline-none text-sm';

/**
 * ------------------------------------------------------------------
 * CHANGE PASSWORD FORM
 * Used full-screen when a user signs in with a temporary password,
 * and as a card on the Settings page.
 * ------------------------------------------------------------------
 */
export const ChangePasswordForm = ({ forced = false, onChanged }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (next.length < MIN_PASSWORD_LENGTH) {
      return setMessage({ type: 'error', text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (next !== confirm) return setMessage({ type: 'error', text: 'New passwords do not match.' });

    setSaving(true);
    try {
      const me = await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      });
      setCurrent(''); setNext(''); setConfirm('');
      setMessage({ type: 'ok', text: 'Password changed.' });
      onChanged?.(me);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          {forced ? 'Temporary password' : 'Current password'}
        </label>
        <input type="password" required autoComplete="current-password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New password</label>
        <input type="password" required autoComplete="new-password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} />
        <p className="text-xs text-slate-400 mt-1">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm new password</label>
        <input type="password" required autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {message && (
        <p className={`text-sm font-bold ${message.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
      )}
      <button type="submit" disabled={saving} className="bg-[#5ABBCE] hover:brightness-95 text-white px-5 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50">
        {saving ? 'Saving...' : 'Change password'}
      </button>
    </form>
  );
};

export const ForcedPasswordChangeView = ({ user, onChanged, onLogout }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <KeyRound className="text-[#5ABBCE]" size={24} /> Set your password
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          Hi {user.name}, you signed in with a temporary password. Choose a new one to continue.
        </p>
      </div>
      <ChangePasswordForm forced onChanged={onChanged} />
      <button onClick={onLogout} className="text-xs text-slate-400 hover:text-slate-600">Sign out</button>
    </div>
  </div>
);

/**
 * ------------------------------------------------------------------
 * USER MANAGEMENT (Admin only)
 * ------------------------------------------------------------------
 */
const roleBadge = {
  Admin: 'bg-rose-50 text-rose-700 border-rose-200',
  Manager: 'bg-purple-50 text-purple-700 border-purple-200',
  Estimator: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const UserManagement = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const EMPTY_FORM = { name: '', username: '', email: '', role: 'Estimator', tempPassword: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const load = async () => {
    try {
      setUsers(await api('/api/users'));
    } catch (err) {
      flash('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const created = await api('/api/users', { method: 'POST', body: form });
      setUsers((u) => [...u, created].sort((a, b) => a.name.localeCompare(b.name) || a.role.localeCompare(b.role)));
      setForm(EMPTY_FORM);
      flash('ok', `${created.name} (${created.role}) added with username "${created.username}". Share the temporary password with them securely; they'll set their own at first sign-in.`);
    } catch (err) {
      flash('error', err.message);
    } finally {
      setAdding(false);
    }
  };

  const update = async (u, changes, successText) => {
    try {
      const updated = await api(`/api/users/${encodeURIComponent(u.id)}`, { method: 'PUT', body: changes });
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      if (successText) flash('ok', successText);
    } catch (err) {
      flash('error', err.message);
    }
  };

  const handleReset = (u) => {
    const temp = prompt(`Enter a temporary password for ${u.name} (at least ${MIN_PASSWORD_LENGTH} characters). They'll be signed out and must choose a new one at next sign-in.`);
    if (temp === null) return;
    if (temp.length < MIN_PASSWORD_LENGTH) return flash('error', `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    update(u, { tempPassword: temp }, `Password reset for ${u.name}.`);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users size={20} className="text-slate-400" /> Users
        </h2>
        <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200">Admin Access</span>
      </div>

      <div className="p-6 space-y-6">
        {message && (
          <p className={`text-sm font-bold flex items-center gap-1 ${message.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {message.type === 'ok' && <CheckCircle size={16} />} {message.text}
          </p>
        )}

        {/* Add user */}
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-slate-50 border border-slate-100 rounded-lg p-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
            <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Username</label>
            <input required pattern="[A-Za-z0-9._@\-]{3,64}" title="3-64 characters: letters, numbers and . _ - @" autoCapitalize="none" spellCheck={false} placeholder="e.g. jsmith.mgr" className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Temporary password</label>
            <input required type="text" autoComplete="off" minLength={MIN_PASSWORD_LENGTH} className={inputClass} value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} />
          </div>
          <button type="submit" disabled={adding} className="flex items-center justify-center gap-2 bg-[#5ABBCE] hover:brightness-95 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">
            <UserPlus size={16} /> {adding ? 'Adding...' : 'Add user'}
          </button>
        </form>

        {/* User list */}
        {loading ? (
          <p className="text-sm text-slate-400">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className={`border-b border-slate-50 ${u.isActive ? '' : 'opacity-50'}`}>
                      <td className="py-3 pr-4 font-bold text-slate-700">{u.name}{isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{u.username}</td>
                      <td className="py-3 pr-4 text-slate-500">{u.email}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => update(u, { role: e.target.value }, `${u.username} is now ${e.target.value}.`)}
                          className={`text-xs font-bold px-2 py-1 rounded-full border ${roleBadge[u.role] || ''} disabled:cursor-not-allowed`}
                        >
                          {ROLES.map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {!u.isActive ? <span className="text-slate-500 font-bold">Deactivated</span>
                          : u.mustChangePassword ? <span className="text-amber-600 font-bold">Awaiting first sign-in</span>
                          : <span className="text-emerald-600 font-bold">Active</span>}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleReset(u)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#5ABBCE] px-2 py-1" title="Reset password">
                          <RotateCcw size={14} /> Reset
                        </button>
                        {!isSelf && (u.isActive ? (
                          <button onClick={() => confirm(`Deactivate ${u.name}? They'll be signed out immediately.`) && update(u, { isActive: false }, `${u.name} deactivated.`)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-1">
                            <Ban size={14} /> Deactivate
                          </button>
                        ) : (
                          <button onClick={() => update(u, { isActive: true }, `${u.name} reactivated.`)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 px-2 py-1">
                            <UserCheck size={14} /> Reactivate
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
