import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Header } from '../../components/AdminList';
import api, { errorMessage } from '../../services/api';
import { utcDay } from '../../services/format';

interface Report {
  title: string;
  columns: string[];
  rows: Record<string, string | number>[];
  summary: Record<string, string | number>;
  note: string;
}

type Mode = 'day' | 'range' | 'month';
const REPORTS: { id: string; label: string; mode: Mode }[] = [
  { id: 'daily-attendance', label: 'Daily', mode: 'day' },
  { id: 'monthly-attendance', label: 'Monthly', mode: 'month' },
  { id: 'performance', label: 'Performance', mode: 'range' },
  { id: 'field-visits', label: 'Field visits', mode: 'range' },
  { id: 'working-hours', label: 'Working hours', mode: 'range' },
  { id: 'location-tracking', label: 'Location', mode: 'range' },
];
const RANGES: [string, string, number][] = [['today', 'Today', 0], ['7d', '7 days', -6], ['30d', '30 days', -29]];
const heading = (k: string) => k.replace(/_pct$/, ' %').replace(/_/g, ' ');
const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7);
};

// Reports & Analytics for admins and managers with the Reports screen. Same endpoint as the web portal.
export default function Reports() {
  const [kind, setKind] = useState(REPORTS[0]);
  const [range, setRange] = useState('7d');
  const [month, setMonth] = useState(utcDay().slice(0, 7));
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useCallback(() => {
    if (kind.mode === 'month') return { month };
    if (kind.mode === 'day') return { date_from: utcDay(), date_to: utcDay() };
    return { date_from: utcDay(RANGES.find((r) => r[0] === range)![2]), date_to: utcDay() };
  }, [kind, range, month]);

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

  // Shared as text: the share sheet can send it to mail, Drive or WhatsApp, where it can be saved as a .csv.
  const exportCsv = async () => {
    try {
      const r = await api.get(`/admin/reports/${kind.id}/`, { params: { ...params(), export: 'csv' }, responseType: 'text' });
      await Share.share({ title: data?.title ?? 'Report', message: String(r.data) });
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    }
  };

  const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity style={[s.chip, on && s.chipOn]} onPress={onPress} accessibilityRole="button">
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Reports" sub="Reports & Analytics" back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={s.chips}>
          {REPORTS.map((r) => <Chip key={r.id} on={r.id === kind.id} label={r.label} onPress={() => setKind(r)} />)}
        </View>
        {kind.mode === 'range' ? (
          <View style={s.chips}>
            {RANGES.map(([k, label]) => <Chip key={k} on={range === k} label={label} onPress={() => setRange(k)} />)}
          </View>
        ) : null}
        {kind.mode === 'month' ? (
          <View style={s.month}>
            <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} accessibilityLabel="Previous month"><Text style={s.arrow}>‹</Text></TouchableOpacity>
            <Text style={s.monthText}>{month}</Text>
            <TouchableOpacity disabled={month >= utcDay().slice(0, 7)} onPress={() => setMonth(shiftMonth(month, 1))} accessibilityLabel="Next month">
              <Text style={[s.arrow, month >= utcDay().slice(0, 7) && { color: '#cbd5e1' }]}>›</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color="#1e3a8a" style={{ marginTop: 12 }} /> : null}
        {error ? <Text style={s.err}>{error}</Text> : null}

        {data && !loading ? (
          <>
            <View style={s.summary}>
              <Text style={s.summaryText}>
                {data.rows.length} rows{Object.entries(data.summary).map(([k, v]) => ` · ${k}: ${v}`).join('')}
              </Text>
              {data.rows.length ? (
                <TouchableOpacity onPress={exportCsv} accessibilityRole="button"><Text style={s.export}>Export CSV</Text></TouchableOpacity>
              ) : null}
            </View>
            {data.note ? <Text style={s.note}>{data.note}</Text> : null}
            {data.rows.length === 0 ? <Text style={s.empty}>No records for this period.</Text> : null}
            {data.rows.map((row, i) => (
              <View key={i} style={s.card}>
                <Text style={s.name}>{row.name}{row.employee_code ? ` · ${row.employee_code}` : ''}</Text>
                {data.columns.filter((c) => c !== 'name' && c !== 'employee_code' && row[c] !== '').map((c) => (
                  <View key={c} style={s.line}>
                    <Text style={s.label}>{heading(c)}</Text>
                    <Text style={s.value}>{String(row[c])}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#e2e8f0' },
  chipOn: { backgroundColor: '#1e3a8a' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextOn: { color: '#fff' },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  arrow: { fontSize: 28, color: '#1e3a8a', paddingHorizontal: 12 },
  monthText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  summaryText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569' },
  export: { color: '#1e3a8a', fontWeight: '700', fontSize: 13 },
  note: { fontSize: 12, color: '#64748b' },
  err: { color: '#dc2626', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  name: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12, color: '#64748b', textTransform: 'capitalize', flexShrink: 1 },
  value: { fontSize: 13, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
