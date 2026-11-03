import { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api, { errorMessage } from '../../services/api';

interface Report {
  title: string;
  columns: string[];
  rows: Record<string, string | number>[];
  summary: Record<string, string | number>;
  note: string;
}

type Mode = 'day' | 'range' | 'month';
const REPORTS: { id: string; label: string; hint: string; mode: Mode; days: number }[] = [
  { id: 'daily-attendance', label: 'Daily Attendance', hint: 'Who punched in, out, was absent or on leave', mode: 'day', days: 1 },
  { id: 'monthly-attendance', label: 'Monthly Attendance', hint: 'Days present, absent and hours per employee', mode: 'month', days: 30 },
  { id: 'performance', label: 'Employee Performance', hint: 'Hours, visits and completion rate', mode: 'range', days: 30 },
  { id: 'field-visits', label: 'Field Visits', hint: 'Every visit with site, outcome and duration', mode: 'range', days: 30 },
  { id: 'working-hours', label: 'Working Hours', hint: 'Total and average hours of completed shifts', mode: 'range', days: 7 },
  { id: 'location-tracking', label: 'Location Tracking', hint: 'GPS points and location-unavailable time per shift', mode: 'range', days: 7 },
];

const ago = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const heading = (k: string) => k.replace(/_pct$/, ' %').replace(/_/g, ' ');
const STATUS_BADGE: Record<string, string> = {
  Present: 'badge-success',
  'On duty': 'badge-info',
  Absent: 'badge-danger',
  'On leave': 'badge-neutral',
  'Missing punch-out': 'badge-warning',
};

export default function ReportsPage() {
  const [kind, setKind] = useState(REPORTS[0]);
  const [from, setFrom] = useState(ago(0));
  const [to, setTo] = useState(ago(0));
  const [month, setMonth] = useState(ago(0).slice(0, 7));
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<string[]>('/admin/departments/').then((r) => setDepartments(r.data)).catch(() => undefined);
  }, []);

  const params = useCallback(
    () => ({
      department: department || undefined,
      ...(kind.mode === 'month' ? { month } : { date_from: from, date_to: kind.mode === 'day' ? from : to }),
    }),
    [kind, from, to, month, department],
  );

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    api
      .get<Report>(`/admin/reports/${kind.id}/`, { params: params() })
      .then((r) => live && setData(r.data))
      .catch((e) => {
        if (!live) return;
        setData(null);
        setError(errorMessage(e));
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [kind, params]);

  const pick = (r: (typeof REPORTS)[number]) => {
    setKind(r);
    setFrom(ago(r.days - 1));
    setTo(ago(0));
  };

  const download = async (ext: 'csv' | 'xlsx') => {
    try {
      const res = await api.get(`/admin/reports/${kind.id}/`, { params: { ...params(), export: ext }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ncode_${kind.id}_${ago(0)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Layout title="Reports & Analytics" subtitle="Ncode Solution IT Division (GNFC) · Central Operations">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => pick(r)}
            aria-pressed={r.id === kind.id}
            className={`card !p-3 text-left card-hover focus:outline-none focus:ring-2 focus:ring-blue-600 ${r.id === kind.id ? '!border-blue-900 !bg-blue-50' : ''}`}
          >
            <p className="text-sm font-bold text-slate-900">{r.label}</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{r.hint}</p>
          </button>
        ))}
      </div>

      <div className="card mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {kind.mode === 'month' ? (
            <div>
              <label className="label" htmlFor="rp-month">Month</label>
              <input id="rp-month" type="month" className="input" value={month} max={ago(0).slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </div>
          ) : (
            <>
              <div>
                <label className="label" htmlFor="rp-from">{kind.mode === 'day' ? 'Date' : 'From'}</label>
                <input id="rp-from" type="date" className="input" value={from} max={ago(0)} onChange={(e) => e.target.value && setFrom(e.target.value)} />
              </div>
              {kind.mode === 'range' && (
                <div>
                  <label className="label" htmlFor="rp-to">To</label>
                  <input id="rp-to" type="date" className="input" value={to} max={ago(0)} onChange={(e) => e.target.value && setTo(e.target.value)} />
                </div>
              )}
            </>
          )}
          <div>
            <label className="label" htmlFor="rp-dept">Department</label>
            <select id="rp-dept" className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => download('csv')} disabled={loading || !data?.rows.length}>
              Export CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => download('xlsx')} disabled={loading || !data?.rows.length}>
              Export Excel
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 whitespace-pre-line">
            {error}
          </p>
        )}

        {data && (
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-neutral">{data.rows.length} rows</span>
            {Object.entries(data.summary).map(([k, v]) => (
              <span key={k} className="badge badge-info">
                {k}: {v}
              </span>
            ))}
          </div>
        )}
        {data?.note && <p className="text-xs text-slate-500">{data.note}</p>}

        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-[#00a29a] text-white">
              <tr>
                {(data?.columns ?? []).map((c) => (
                  <th key={c} className="py-2.5 px-3 whitespace-nowrap">{heading(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr><td className="py-10 text-center text-slate-400" colSpan={12}>Loading report…</td></tr>
              )}
              {!loading && data && data.rows.length === 0 && (
                <tr><td className="py-10 text-center text-slate-400" colSpan={12}>No records for these filters.</td></tr>
              )}
              {!loading && !data && !error && (
                <tr><td className="py-10 text-center text-slate-400" colSpan={12}>Choose a report.</td></tr>
              )}
              {!loading &&
                data?.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    {data.columns.map((c) => (
                      <td key={c} className={`py-2.5 px-3 whitespace-nowrap ${typeof row[c] === 'number' ? 'tabular-nums' : ''}`}>
                        {c === 'status' && STATUS_BADGE[String(row[c])] ? (
                          <span className={`badge ${STATUS_BADGE[String(row[c])]}`}>{row[c]}</span>
                        ) : row[c] === '' ? (
                          '—'
                        ) : (
                          row[c]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
