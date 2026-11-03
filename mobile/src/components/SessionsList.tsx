import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SectionList, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Pill } from './AdminList';
import api, { errorMessage, fetchAll } from '../services/api';
import { dur, isMissingPunchOut, utcDay, when } from '../services/format';

export interface Sess {
  id: number;
  user: number;
  display_name: string;
  employee_id?: string;
  status: string;
  tracking_status: string;
  punch_in_at: string;
  punch_out_at: string | null;
  duration_seconds: number;
  visits_count?: number;
}

type Range = 'today' | '7d' | '30d' | 'all' | 'custom';
type StatusFilter = '' | 'ACTIVE' | 'COMPLETED' | 'MISSING';

const RANGES: [Range, string][] = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All'], ['custom', 'Dates']];
const STATUSES: [StatusFilter, string][] = [['', 'All'], ['ACTIVE', 'On duty'], ['COMPLETED', 'Punched out'], ['MISSING', 'Missing punch-out']];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Attendance records for admins and managers: date-wise, with total hours, missing punch-outs and a CSV export.
export default function SessionsList({ header }: { header: ReactNode }) {
  const [range, setRange] = useState<Range>('7d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [rows, setRows] = useState<Sess[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useCallback(() => {
    const p: Record<string, string> = {};
    if (range === 'today') p.date_from = p.date_to = utcDay();
    if (range === '7d') p.date_from = utcDay(-6);
    if (range === '30d') p.date_from = utcDay(-29);
    if (range === 'custom') {
      if (DAY.test(from)) p.date_from = from;
      if (DAY.test(to)) p.date_to = to;
    }
    if (status === 'ACTIVE' || status === 'MISSING') p.status = 'ACTIVE';
    if (status === 'COMPLETED') p.status = 'COMPLETED';
    return p;
  }, [range, from, to, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetchAll<Sess>('/admin/sessions/', params(), 8);
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (range === 'custom' && !DAY.test(from) && !DAY.test(to)) return; // wait until a date is typed
    load();
  }, [load, range, from, to]);

  const shown = status === 'MISSING' ? rows.filter(isMissingPunchOut) : rows;
  const days = [...new Set(shown.map((s) => s.punch_in_at.slice(0, 10)))].sort().reverse();
  const sections = days.map((day) => {
    const data = shown.filter((s) => s.punch_in_at.slice(0, 10) === day);
    return { day, hours: data.reduce((n, s) => n + s.duration_seconds, 0), data };
  });
  const missing = rows.filter(isMissingPunchOut).length;

  // Shared as text: the phone's share sheet can send it to mail, Drive or WhatsApp, where it can be saved as a .csv.
  const exportCsv = async () => {
    try {
      const r = await api.get('/admin/sessions/export-csv/', { params: params(), responseType: 'text' });
      await Share.share({ title: 'Attendance export', message: String(r.data) });
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    }
  };

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      sections={sections}
      keyExtractor={(s) => String(s.id)}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ marginHorizontal: -16, marginTop: -16, marginBottom: 6 }}>
          {header}
          <View style={s.filters}>
            <View style={s.chips}>
              {RANGES.map(([k, label]) => (
                <TouchableOpacity key={k} style={[s.chip, range === k && s.chipOn]} onPress={() => setRange(k)}>
                  <Text style={[s.chipText, range === k && s.chipTextOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {range === 'custom' ? (
              <View style={s.dates}>
                <TextInput style={s.date} placeholder="From YYYY-MM-DD" placeholderTextColor="#94a3b8" value={from} onChangeText={setFrom} autoCapitalize="none" maxLength={10} />
                <TextInput style={s.date} placeholder="To YYYY-MM-DD" placeholderTextColor="#94a3b8" value={to} onChangeText={setTo} autoCapitalize="none" maxLength={10} />
              </View>
            ) : null}
            <View style={s.chips}>
              {STATUSES.map(([k, label]) => (
                <TouchableOpacity key={k || 'all'} style={[s.chip, status === k && s.chipOn]} onPress={() => setStatus(k)}>
                  <Text style={[s.chipText, status === k && s.chipTextOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.summary}>
              <Text style={s.summaryText}>
                {shown.length} shift{shown.length === 1 ? '' : 's'} · {dur(shown.reduce((n, x) => n + x.duration_seconds, 0))} worked
                {missing ? ` · ${missing} missing punch-out` : ''}
              </Text>
              <TouchableOpacity onPress={exportCsv} accessibilityRole="button">
                <Text style={s.export}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            {total > rows.length ? <Text style={s.warn}>Showing the newest {rows.length} of {total}. Narrow the dates to see the rest.</Text> : null}
            {error ? <Text style={s.err}>{error}</Text> : null}
            {loading ? <ActivityIndicator style={{ marginTop: 8 }} color="#0088ff" /> : null}
          </View>
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Text style={s.empty}>No attendance for these filters.</Text>}
      renderSectionHeader={({ section }) => (
        <View style={s.dayRow}>
          <Text style={s.day}>{new Date(section.day).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</Text>
          <Text style={s.dayMeta}>{section.data.length} · {dur(section.hours)}</Text>
        </View>
      )}
      renderItem={({ item: x }) => (
        <TouchableOpacity style={s.card} onPress={() => router.push(`/route/${x.id}` as never)} accessibilityRole="button">
          <View style={s.row}>
            <Text style={s.name}>{x.display_name}{x.employee_id ? ` · ${x.employee_id}` : ''}</Text>
            {isMissingPunchOut(x) ? (
              <Pill text="MISSING PUNCH-OUT" color="#dc2626" bg="#fef2f2" />
            ) : (
              <Pill text={x.status} color={x.status === 'ACTIVE' ? '#16a34a' : '#64748b'} bg={x.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'} />
            )}
          </View>
          <Text style={s.meta}>In: {when(x.punch_in_at)}</Text>
          <Text style={s.meta}>Out: {when(x.punch_out_at)} · {dur(x.duration_seconds)}</Text>
          <Text style={s.meta}>Tracking: {x.tracking_status} · {x.visits_count ?? 0} visits · tap for route</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const s = StyleSheet.create({
  filters: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9' },
  chipOn: { backgroundColor: '#0088ff' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextOn: { color: '#fff' },
  dates: { flexDirection: 'row', gap: 8 },
  date: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0f172a' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  summaryText: { flex: 1, fontSize: 12, color: '#475569', fontWeight: '600' },
  export: { color: '#0088ff', fontWeight: '700', fontSize: 13 },
  warn: { fontSize: 12, color: '#b45309' },
  err: { color: '#dc2626', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  day: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  dayMeta: { fontSize: 12, color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b' },
});
