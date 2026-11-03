import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Header, Pill } from '../../../components/AdminList';
import LiveMapView from '../../../components/LiveMapView';
import { useAuth } from '../../../hooks/useAuth';
import api, { errorMessage, fetchAll, unwrapList } from '../../../services/api';
import { dur, isMissingPunchOut, utcDay, when } from '../../../services/format';
import { can } from '../../../services/permissions';

interface Summary {
  total_users: number;
  active_users: number;
  currently_tracking: number;
  location_unavailable: number;
  today_punch_ins: number;
  today_punch_outs: number;
  completed_sessions: number;
  today_visits: number;
}
interface Shift {
  id: number;
  user: number;
  display_name: string;
  status: string;
  punch_in_at: string;
  punch_out_at: string | null;
  duration_seconds: number;
}
interface Found {
  id: number;
  employee_code: string;
  name: string;
}
interface Stats {
  present: number;
  workSeconds: number;
  missing: number;
  week: { day: string; count: number }[];
}

const TILES: [keyof Summary, string][] = [
  ['total_users', 'Total Employees'],
  ['active_users', 'On Field Duty'],
  ['currently_tracking', 'Tracking Now'],
  ['location_unavailable', 'Location Issues'],
  ['today_punch_ins', 'Punch-ins Today'],
  ['today_punch_outs', 'Punch-outs Today'],
  ['completed_sessions', 'Completed Sessions'],
  ['today_visits', 'Visits Today'],
];

// Present = punched in at least once today. Counts per day are people, not shifts.
function statsFrom(sessions: Shift[], active: Shift[]): Stats {
  const today = utcDay();
  const days = Array.from({ length: 7 }, (_, i) => utcDay(i - 6));
  const people = (day: string) => new Set(sessions.filter((s) => s.punch_in_at.slice(0, 10) === day).map((s) => s.user));
  const todays = sessions.filter((s) => s.punch_in_at.slice(0, 10) === today);
  return {
    present: people(today).size,
    workSeconds: todays.reduce((n, s) => n + s.duration_seconds, 0),
    missing: active.filter(isMissingPunchOut).length,
    week: days.map((day) => ({ day, count: people(day).size })),
  };
}

export default function Overview() {
  const { user, logout } = useAuth();
  const [s, setS] = useState<Summary | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [matches, setMatches] = useState<Found[]>([]);
  const [lookupMsg, setLookupMsg] = useState('');
  const canSessions = can(user, 'attendance.sessions');

  useFocusEffect(
    useCallback(() => {
      api.get<Summary>('/admin/summary/').then((r) => setS(r.data)).catch((e) => setError(errorMessage(e)));
      if (canSessions) {
        Promise.all([fetchAll<Shift>('/admin/sessions/', { date_from: utcDay(-6) }), fetchAll<Shift>('/admin/sessions/', { status: 'ACTIVE' })])
          .then(([week, active]) => {
            setStats(statsFrom(week.rows, active.rows));
            setShifts(week.rows.slice(0, 5));
          })
          .catch(() => {});
      }
    }, [canSessions]),
  );

  // Employee details by EC number: open the exact match, or let the admin pick from the close matches.
  const find = async () => {
    const q = code.trim();
    if (!q) return;
    setLookupMsg('');
    setMatches([]);
    try {
      const rows = unwrapList<Found>((await api.get('/admin/employees/', { params: { search: q } })).data);
      const exact = rows.find((r) => r.employee_code.toLowerCase() === q.toLowerCase()) ?? (rows.length === 1 ? rows[0] : null);
      if (exact) router.push(`/employee/${exact.id}` as never);
      else if (rows.length) setMatches(rows.slice(0, 6));
      else setLookupMsg(`No employee with EC number ${q}.`);
    } catch (e) {
      setLookupMsg(errorMessage(e));
    }
  };

  const peak = Math.max(1, ...(stats?.week.map((d) => d.count) ?? [1]));

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Command Center" sub={`${user?.full_name || user?.username} · ${user?.role}`} />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
        {can(user, 'setup.employee') ? (
          <View style={styles.card}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                placeholder="Find employee by EC number"
                placeholderTextColor="#94a3b8"
                value={code}
                onChangeText={setCode}
                onSubmitEditing={find}
                returnKeyType="search"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.findBtn} onPress={find}>
                <Text style={styles.findText}>Find</Text>
              </TouchableOpacity>
            </View>
            {lookupMsg ? <Text style={styles.err}>{lookupMsg}</Text> : null}
            {matches.map((m) => (
              <TouchableOpacity key={m.id} onPress={() => router.push(`/employee/${m.id}` as never)} style={styles.match}>
                <Text style={styles.matchText}>{m.employee_code} · {m.name}</Text>
              </TouchableOpacity>
            ))}
            {user?.role === 'ADMIN' ? (
              <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/employee-new' as never)}>
                <Text style={styles.newText}>＋ New employee (generates EC number)</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.grid}>
          {error ? <Text style={styles.err}>{error}</Text> : null}
          {!s && !error ? <ActivityIndicator color="#0088ff" /> : null}
          {s &&
            TILES.map(([k, label]) => (
              <View key={k} style={styles.tile}>
                <Text style={styles.value}>{s[k]}</Text>
                <Text style={styles.label}>{label}</Text>
              </View>
            ))}
          {s && stats ? (
            <>
              <View style={styles.tile}>
                <Text style={[styles.value, { color: '#047857' }]}>{stats.present}</Text>
                <Text style={styles.label}>Present Today</Text>
              </View>
              <View style={styles.tile}>
                <Text style={[styles.value, { color: '#b45309' }]}>{Math.max(0, s.total_users - stats.present)}</Text>
                <Text style={styles.label}>Not Punched In</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.value}>{dur(stats.workSeconds)}</Text>
                <Text style={styles.label}>Working Hours Today</Text>
              </View>
              <View style={styles.tile}>
                <Text style={[styles.value, stats.missing > 0 && { color: '#dc2626' }]}>{stats.missing}</Text>
                <Text style={styles.label}>Missing Punch-out</Text>
              </View>
            </>
          ) : null}
        </View>

        {stats ? (
          <View style={styles.card}>
            <Text style={styles.h}>Employees present, last 7 days</Text>
            <View style={styles.chart}>
              {stats.week.map((d) => (
                <View key={d.day} style={styles.barCol}>
                  <Text style={styles.barNum}>{d.count}</Text>
                  <View style={[styles.bar, { height: 8 + (d.count / peak) * 88 }, d.day === utcDay() && { backgroundColor: '#0088ff' }]} />
                  <Text style={styles.barDay}>{new Date(d.day).toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' })}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.h}>Live field map</Text>
            <TouchableOpacity onPress={() => router.navigate('/map')}>
              <Text style={styles.link}>Open full map ›</Text>
            </TouchableOpacity>
          </View>
          <LiveMapView preview style={styles.map} />
        </View>

        {canSessions ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.h}>Recent shifts</Text>
              <TouchableOpacity onPress={() => router.navigate('/attendance')}>
                <Text style={styles.link}>View all ›</Text>
              </TouchableOpacity>
            </View>
            {shifts.length === 0 ? <Text style={styles.meta}>No shifts yet.</Text> : null}
            {shifts.map((x) => (
              <TouchableOpacity key={x.id} style={styles.shift} onPress={() => router.push(`/route/${x.id}` as never)}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{x.display_name}</Text>
                  {isMissingPunchOut(x) ? <Pill text="MISSING PUNCH-OUT" color="#dc2626" bg="#fef2f2" /> : <Pill text={x.status} color={x.status === 'ACTIVE' ? '#16a34a' : '#64748b'} bg={x.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'} />}
                </View>
                <Text style={styles.meta}>In {when(x.punch_in_at)}</Text>
                <Text style={styles.meta}>Out {when(x.punch_out_at)} · {dur(x.duration_seconds)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Text style={{ color: '#dc2626', fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a' },
  findBtn: { backgroundColor: '#0088ff', borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center' },
  findText: { color: '#fff', fontWeight: '700' },
  newBtn: { backgroundColor: '#e0f2fe', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  newText: { color: '#0369a1', fontWeight: '700', fontSize: 13 },
  match: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  matchText: { color: '#0f172a', fontSize: 14 },
  err: { color: '#dc2626', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47.5%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  value: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  label: { fontSize: 12, color: '#64748b', marginTop: 4 },
  h: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  link: { color: '#0088ff', fontWeight: '700', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingTop: 8 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: 22, borderRadius: 6, backgroundColor: '#93c5fd' },
  barNum: { fontSize: 11, fontWeight: '700', color: '#334155' },
  barDay: { fontSize: 10, color: '#64748b' },
  map: { height: 230, borderRadius: 10, overflow: 'hidden' },
  shift: { gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  meta: { fontSize: 12, color: '#64748b' },
  logout: { backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
});
