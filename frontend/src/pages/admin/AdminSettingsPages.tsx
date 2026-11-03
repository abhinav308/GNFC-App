import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import api, { errorMessage } from '../../services/api';
import { fmtDate, fmtTime } from '../../services/format';
import type { Page } from '../../types';

const SUBTITLE = 'Admin Settings';

function Notice({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 whitespace-pre-line">
      {error}
    </p>
  ) : null;
}

/* ------------------------------ Admin Profile ------------------------------ */

export function AdminProfilePage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const startEdit = () => {
    setForm({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' });
    setError('');
    setEdit(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/auth/me/', form);
      window.location.reload(); // the signed-in user is loaded once at start-up
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const rows: [string, string | undefined][] = [
    ['Name', user?.full_name || user?.username],
    ['Username', user?.username],
    ['Email', user?.email || '—'],
    ['Mobile', user?.phone || '—'],
    ['Portal role', user?.role === 'ADMIN' ? 'Administrator' : 'Manager'],
    ['Access role', user?.role === 'ADMIN' ? 'Full access' : user?.access_role?.name || '—'],
    ['Employee ID', user?.profile?.employee_id],
  ];
  return (
    <Layout title="Admin Profile" subtitle={SUBTITLE}>
      <div className="card max-w-2xl space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
              <dd className="text-sm font-medium text-slate-900 break-words">{v || '—'}</dd>
            </div>
          ))}
        </dl>
        {edit && (
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            {([['first_name', 'First name'], ['last_name', 'Last name'], ['email', 'Email'], ['phone', 'Mobile']] as const).map(([k, label]) => (
              <div key={k}>
                <label className="label" htmlFor={`pf-${k}`}>{label}</label>
                <input id={`pf-${k}`} className="input" type={k === 'email' ? 'email' : 'text'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-700 whitespace-pre-line">{error}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn btn-primary">Save profile</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </form>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {!edit && <button type="button" className="btn btn-primary" onClick={startEdit}>Edit profile</button>}
          <button type="button" className="btn btn-ghost" onClick={() => nav('/admin/change-password')}>Change Password</button>
          <button type="button" className="btn btn-ghost" onClick={() => nav('/admin/settings')}>More administration tools</button>
          <button
            type="button"
            className="btn btn-danger ml-auto"
            onClick={() => {
              logout();
              nav('/login', { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </Layout>
  );
}

/* --------------------------- Department Management --------------------------- */

interface Dept {
  id: number;
  name: string;
  is_active: boolean;
  employees: number;
}

export function DepartmentsPage() {
  const [rows, setRows] = useState<Dept[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(() => {
    api
      .get<Dept[]>('/admin/department-master/', { params: { no_page: 1 } })
      .then((r) => setRows(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      await api.post('/admin/department-master/', { name });
      setName('');
    });
  };

  return (
    <Layout title="Department Management" subtitle={SUBTITLE}>
      <div className="card max-w-3xl space-y-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="label" htmlFor="dept-name">New department</label>
            <input id="dept-name" className="input" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Field Operations" />
          </div>
          <button className="btn btn-primary" disabled={!name.trim()}>Add department</button>
        </form>
        <Notice error={error} />
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-[#00a29a] text-white">
              <tr>
                <th className="py-2.5 px-3">Department</th>
                <th className="px-3">Employees</th>
                <th className="px-3">Status</th>
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows === null && !error && <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400">No departments yet.</td></tr>}
              {rows?.map((d) => (
                <tr key={d.id}>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {editing?.id === d.id ? (
                      <input
                        className="input" autoFocus maxLength={100} value={editing.name} aria-label="Department name"
                        onChange={(e) => setEditing({ id: d.id, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
                      />
                    ) : d.name}
                  </td>
                  <td className="px-3 tabular-nums">{d.employees}</td>
                  <td className="px-3">
                    <span className={`badge ${d.is_active ? 'badge-success' : 'badge-neutral'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-1.5 whitespace-nowrap">
                    {editing?.id === d.id ? (
                      <>
                        <button className="btn btn-primary" onClick={() => run(async () => { await api.patch(`/admin/department-master/${d.id}/`, { name: editing.name }); setEditing(null); })}>Save</button>
                        <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost" onClick={() => setEditing({ id: d.id, name: d.name })}>Rename</button>
                        <button className="btn btn-ghost" onClick={() => run(() => api.patch(`/admin/department-master/${d.id}/`, { is_active: !d.is_active }))}>
                          {d.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => window.confirm(`Delete department "${d.name}"?`) && run(() => api.delete(`/admin/department-master/${d.id}/`))}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Renaming a department updates every employee in it. A department with employees cannot be deleted. Deactivate it instead.
        </p>
      </div>
    </Layout>
  );
}

/* ---------------------------- Session & Security ---------------------------- */

interface SecurityData {
  policy: { access_token_minutes: number; refresh_token_days: number; refresh_rotation: boolean; min_password_length: number; temp_password_forced_change: boolean };
  sessions: { user_id: number; username: string; name: string; role: string; devices: number; signed_in_since: string; last_login: string | null }[];
}
interface AuditRow {
  id: number;
  actor_name: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
}

export function SecurityPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SecurityData | null>(null);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<Page<AuditRow> | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const loadSessions = useCallback(() => {
    api.get<SecurityData>('/admin/security/').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(loadSessions, [loadSessions]);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get<Page<AuditRow>>('/admin/audit/', { params: { search: q || undefined, page } })
        .then((r) => setAudit(r.data))
        .catch((e) => setError(errorMessage(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, page]);

  const signOut = async (id: number, name: string) => {
    if (!window.confirm(`Sign ${name} out of every device? They will need to log in again.`)) return;
    setError('');
    try {
      await api.post(`/admin/security/sign-out/${id}/`);
      loadSessions();
      setPage(1);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const p = data?.policy;
  const policy: [string, string][] = p
    ? [
        ['Access token lifetime', `${p.access_token_minutes} minutes`],
        ['Login (refresh) lifetime', `${p.refresh_token_days} days`],
        ['Token rotation', p.refresh_rotation ? 'On: each refresh issues a new token' : 'Off'],
        ['Minimum password length', `${p.min_password_length} characters`],
        ['Temporary passwords', p.temp_password_forced_change ? 'Must be changed at first sign-in' : 'Optional'],
      ]
    : [];

  return (
    <Layout title="Session & Security Settings" subtitle={SUBTITLE}>
      <div className="space-y-4">
        <Notice error={error} />

        <div className="card">
          <h2 className="font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100">Security policy</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
            {policy.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
                <dd className="text-sm font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">These are set on the server. Changing them needs a redeploy.</p>
        </div>

        <div className="card overflow-x-auto">
          <h2 className="font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100">Active sign-ins ({data?.sessions.length ?? '…'})</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-[#00a29a] text-white">
              <tr>
                <th className="py-2.5 px-3">User</th>
                <th className="px-3">Role</th>
                <th className="px-3">Open logins</th>
                <th className="px-3">Signed in since</th>
                <th className="px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data?.sessions.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nobody is signed in.</td></tr>}
              {data?.sessions.map((s) => (
                <tr key={s.user_id}>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{s.name} <span className="text-xs text-slate-500">· {s.username}</span></td>
                  <td className="px-3">{s.role}</td>
                  <td className="px-3 tabular-nums">{s.devices}</td>
                  <td className="px-3">{fmtDate(s.signed_in_since)} {fmtTime(s.signed_in_since)}</td>
                  <td className="px-3 text-right">
                    {s.user_id === user?.id ? (
                      <span className="text-xs text-slate-400">You</span>
                    ) : (
                      <button className="btn btn-danger" onClick={() => signOut(s.user_id, s.name)}>Sign out</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">A signed-out user can keep working until their short access token expires (up to {p?.access_token_minutes ?? 15} minutes).</p>
        </div>

        <div className="card overflow-x-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">Audit trail</h2>
              <p className="text-xs text-slate-500">Sensitive admin actions. Records cannot be edited or deleted.</p>
            </div>
            <input className="input !w-64" placeholder="Search who, action or target…" aria-label="Search audit trail" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-[#00a29a] text-white">
              <tr>
                <th className="py-2.5 px-3">When</th>
                <th className="px-3">Who</th>
                <th className="px-3">Action</th>
                <th className="px-3">Target</th>
                <th className="px-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {audit === null && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading…</td></tr>}
              {audit?.results.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">No audit records yet.</td></tr>}
              {audit?.results.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 px-3 whitespace-nowrap">{fmtDate(a.created_at)} {fmtTime(a.created_at)}</td>
                  <td className="px-3">{a.actor_name}</td>
                  <td className="px-3"><span className="badge badge-info">{a.action.replace(/_/g, ' ')}</span></td>
                  <td className="px-3">{a.target || '—'}</td>
                  <td className="px-3 text-slate-600">{a.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {audit && (audit.next || audit.previous) && (
            <div className="flex items-center justify-end gap-2">
              <button className="btn btn-ghost" disabled={!audit.previous} onClick={() => setPage((n) => n - 1)}>‹ Newer</button>
              <span className="text-xs text-slate-500">Page {page}</span>
              <button className="btn btn-ghost" disabled={!audit.next} onClick={() => setPage((n) => n + 1)}>Older ›</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
