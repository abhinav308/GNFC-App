import { FormEvent, useState } from 'react';
import useOptions from '../hooks/useOptions';
import api, { errorMessage } from '../services/api';

interface Created {
  employee_code: string;
  name: string;
  email_sent: boolean;
}

const EMPTY = { name: '', email: '', mobile: '', esic_number: '', department: '', designation: '', reports_to: '' };

/** Admin only: creates the employee with the next EC number and emails a temporary password (POST /admin/employees/onboard/). */
export default function OnboardEmployee({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { options } = useOptions();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Created | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body: Record<string, unknown> = { name: f.name.trim(), email: f.email.trim() };
      if (f.mobile.trim()) body.mobile = f.mobile.trim();
      if (f.esic_number.trim()) body.esic_number = f.esic_number.trim();
      if (f.department) body.department = f.department;
      if (f.designation) body.designation = Number(f.designation);
      if (f.reports_to) body.reports_to = Number(f.reports_to);
      setCreated((await api.post<Created>('/admin/employees/onboard/', body)).data);
      setF(EMPTY);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 border-blue-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900">Add new employee</h3>
          <p className="text-xs text-slate-500">The EC number is generated automatically and a temporary password is emailed. They must change it at first sign-in.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>

      {created && (
        <p role="status" className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {created.name} created as <strong>{created.employee_code}</strong>.{' '}
          {created.email_sent ? 'The temporary password was emailed.' : 'The email could not be sent, so use Reset password for this employee.'}
        </p>
      )}
      {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 whitespace-pre-line">{error}</p>}

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="ob-name">Full name *</label>
          <input id="ob-name" className="input" required value={f.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="ob-email">Email *</label>
          <input id="ob-email" type="email" className="input" required value={f.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label" htmlFor="ob-mobile">Mobile</label>
          <input id="ob-mobile" className="input" value={f.mobile} onChange={set('mobile')} />
        </div>
        <div>
          <label className="label" htmlFor="ob-esic">ESIC number</label>
          <input id="ob-esic" className="input" value={f.esic_number} onChange={set('esic_number')} />
        </div>
        <div>
          <label className="label" htmlFor="ob-dept">Department</label>
          <select id="ob-dept" className="input" value={f.department} onChange={set('department')}>
            <option value="">Select…</option>
            {options?.departments?.map((d) => <option key={d.id} value={d.label}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ob-desig">Designation</label>
          <select id="ob-desig" className="input" value={f.designation} onChange={set('designation')}>
            <option value="">Select…</option>
            {options?.designations.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ob-mgr">Reports to (manager)</label>
          <select id="ob-mgr" className="input" value={f.reports_to} onChange={set('reports_to')}>
            <option value="">None</option>
            {options?.employees.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn btn-primary w-full" disabled={busy || !f.name.trim() || !f.email.trim()}>
            {busy ? 'Creating…' : 'Create employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
