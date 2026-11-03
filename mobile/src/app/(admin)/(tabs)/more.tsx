import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../../components/AdminList';
import { useAuth } from '../../../hooks/useAuth';
import { MASTERS } from '../../../services/masters';
import { can } from '../../../services/permissions';

export default function More() {
  const { user, logout } = useAuth();
  const items = [
    { path: '/profile', icon: '👤', title: 'My profile', sub: 'Your account and portal access', show: true },
    { path: '/leaves', icon: '📝', title: 'Leave requests', sub: 'Approve or reject leave', show: can(user, 'attendance.leaves') },
    { path: '/setup', icon: '🏢', title: 'Setup', sub: 'Zones, offices, agencies, designations, employees', show: MASTERS.some((m) => can(user, m.screen)) },
    { path: '/reports', icon: '📊', title: 'Reports & Analytics', sub: 'Attendance, performance, visits, hours, location', show: can(user, 'reports') },
    { path: '/departments', icon: '🏬', title: 'Department Management', sub: 'Add, rename, activate departments', show: user?.role === 'ADMIN' },
    { path: '/security', icon: '🛡️', title: 'Session & Security', sub: 'Active sign-ins and audit trail', show: user?.role === 'ADMIN' },
    { path: '/change-password', icon: '🔑', title: 'Change password', sub: 'Update your own login password', show: true },
  ].filter((i) => i.show);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="More" sub={`${user?.full_name ?? ''} · ${user?.role ?? ''}`} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {items.map((i) => (
          <TouchableOpacity key={i.path} style={s.card} onPress={() => router.push(i.path as never)}>
            <Text style={s.icon}>{i.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{i.title}</Text>
              <Text style={s.sub}>{i.sub}</Text>
            </View>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.logout} onPress={logout}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  chev: { fontSize: 22, color: '#94a3b8' },
  logout: { marginTop: 10, backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontWeight: '700' },
});
