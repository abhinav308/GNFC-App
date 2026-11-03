import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/AdminList';
import { useAuth } from '../../hooks/useAuth';
import { MASTERS } from '../../services/masters';
import { can } from '../../services/permissions';

const ROLE = { ADMIN: 'Administrator', MANAGER: 'Manager', USER: 'Field staff' } as const;

export default function Profile() {
  const { user } = useAuth();
  const p = user?.profile;
  const rows: [string, string | undefined][] = [
    ['Name', user?.full_name || user?.username],
    ['Username / EC number', user?.username],
    ['Role', user ? ROLE[user.role] : undefined],
    ['Email', user?.email],
    ['Mobile', user?.phone],
    ['Designation', p?.designation],
    ['Department', p?.department],
    ['Status', user?.is_active ? 'Active' : 'Inactive'],
  ];
  const screens = [
    ['Dashboard and live map', can(user, 'dashboard')],
    ['Attendance records', can(user, 'attendance.sessions')],
    ['Field visits', can(user, 'attendance.visits')],
    ['Leave requests', can(user, 'attendance.leaves')],
    ['Employees and users', can(user, 'user_management.user')],
    ['Setup masters', MASTERS.some((m) => can(user, m.screen))],
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="My profile" back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={s.card}>
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <View key={k} style={s.row}>
              <Text style={s.label}>{k}</Text>
              <Text style={s.value}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={s.card}>
          <Text style={s.h}>Portal access</Text>
          {screens.map(([name, ok]) => (
            <Text key={name} style={[s.line, !ok && { color: '#94a3b8' }]}>{ok ? '✓' : '✗'}  {name}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12, color: '#64748b', width: 130 },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1 },
  h: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  line: { fontSize: 13, color: '#0f172a' },
});
