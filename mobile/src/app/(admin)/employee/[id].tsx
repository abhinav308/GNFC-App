import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Header, Pill } from '../../../components/AdminList';
import { useAuth } from '../../../hooks/useAuth';
import api, { errorMessage, unwrapList } from '../../../services/api';
import { can } from '../../../services/permissions';

type Emp = Record<string, unknown> & { id: number; employee_code: string; name: string; email: string; has_login: boolean; is_active: boolean; status: string };
interface Shift {
  id: number;
  status: string;
  tracking_status: string;
  punch_in_at: string;
  punch_out_at: string | null;
  duration_seconds: number;
}

// Shown in this order when the employee has a value for it.
const DETAILS: [string, string][] = [
  ['mobile', 'Mobile'],
  ['email', 'Email'],
  ['designation_name', 'Designation'],
  ['department', 'Department'],
  ['office_name', 'Office'],
  ['reports_to_name', 'Reports to'],
  ['zone_name', 'Zone'],
  ['district_name', 'District'],
  ['taluka_name', 'Taluka'],
  ['village_name', 'Village'],
  ['esic_number', 'ESIC number'],
  ['start_date', 'Start date'],
  ['office_address', 'Address'],
];

const dur = (s: number) => `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export default function EmployeeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [emp, setEmp] = useState<Emp | null>(null);
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setEmp((await api.get<Emp>(`/admin/employees/${id}/`)).data);
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    if (can(user, 'attendance.sessions')) {
      api.get('/admin/sessions/', { params: { user: id } }).then((r) => setShifts(unwrapList<Shift>(r.data).slice(0, 30))).catch(() => setShifts([]));
    }
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const reset = () =>
    Alert.alert('Reset password', `Email a new temporary password to ${emp?.email}? ${emp?.name} will be signed out everywhere.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setBusy(true);
          try {
            const r = await api.post(`/admin/employees/${id}/reset-password/`);
            Alert.alert(r.data.email_sent ? 'Email sent' : 'Password reset', r.data.email_sent ? 'The employee must choose a new password at the next sign-in.' : 'The email could not be sent. Check the mail settings and try again.');
            load();
          } catch (e) {
            Alert.alert('Failed', errorMessage(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const active = shifts?.[0]?.status === 'ACTIVE' ? shifts[0] : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title={emp?.name ?? 'Employee'} sub={emp ? `EC number ${emp.employee_code}` : undefined} back />
      {!emp ? (
        error ? <Text style={s.err}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color="#0088ff" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={s.card}>
            <View style={s.pills}>
              <Pill text={emp.status} color={emp.status === 'ACTIVE' ? '#16a34a' : '#64748b'} bg={emp.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'} />
              <Pill text={emp.has_login ? 'HAS LOGIN' : 'NO LOGIN'} color={emp.has_login ? '#0369a1' : '#d97706'} bg={emp.has_login ? '#e0f2fe' : '#fffbeb'} />
              {active ? <Pill text="ON DUTY" color="#16a34a" bg="#ecfdf5" /> : null}
            </View>
            {active ? <Text style={s.meta}>On duty since {when(active.punch_in_at)} · tracking {active.tracking_status.toLowerCase().replace(/_/g, ' ')}</Text> : null}
            {DETAILS.filter(([k]) => emp[k]).map(([k, label]) => (
              <View key={k} style={s.row}>
                <Text style={s.label}>{label}</Text>
                <Text style={s.value}>{String(emp[k])}</Text>
              </View>
            ))}
          </View>

          {user?.role === 'ADMIN' && emp.has_login && emp.email ? (
            <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={reset} disabled={busy}>
              <Text style={s.btnText}>Reset password and email it</Text>
            </TouchableOpacity>
          ) : null}

          {shifts ? (
            <View style={s.card}>
              <Text style={s.h}>Shift history</Text>
              {shifts.length === 0 ? <Text style={s.meta}>No shifts yet.</Text> : null}
              {shifts.map((x) => (
                <TouchableOpacity key={x.id} style={s.shift} onPress={() => router.push(`/route/${x.id}` as never)} accessibilityRole="button">
                  <View style={s.rowBetween}>
                    <Text style={s.value}>{new Date(x.punch_in_at).toLocaleDateString()}</Text>
                    <Pill text={x.status} color={x.status === 'ACTIVE' ? '#16a34a' : '#64748b'} bg={x.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'} />
                  </View>
                  <Text style={s.meta}>In {when(x.punch_in_at)}</Text>
                  <Text style={s.meta}>Out {when(x.punch_out_at)} · {dur(x.duration_seconds)} · tap for route</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  pills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#64748b', width: 96 },
  value: { fontSize: 14, color: '#0f172a', flex: 1, fontWeight: '600' },
  meta: { fontSize: 12, color: '#64748b' },
  h: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  shift: { gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btn: { backgroundColor: '#0088ff', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  err: { color: '#dc2626', padding: 16 },
});
