export const dur = (s: number) => `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');
export const timeOf = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

// shortcut: days are UTC dates, like the backend's own "today" counts, so a day changes at 5:30 am in India. Move to the
// server's time zone if the backend ever gets one.
export const utcDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);

// Still on duty from an earlier day: the employee forgot to punch out.
export const isMissingPunchOut = (s: { status: string; punch_in_at: string }) => s.status === 'ACTIVE' && s.punch_in_at.slice(0, 10) < utcDay();
