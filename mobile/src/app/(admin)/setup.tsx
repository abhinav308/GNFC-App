import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../components/AdminList';
import { useAuth } from '../../hooks/useAuth';
import { MASTERS } from '../../services/masters';
import { can } from '../../services/permissions';

export default function Setup() {
  const { user } = useAuth();
  const allowed = MASTERS.filter((m) => can(user, m.screen));
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Setup" sub="Zones, offices, agencies, designations and employees" back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {allowed.map((m) => (
          <TouchableOpacity key={m.kind} style={s.card} onPress={() => router.push(`/master/${m.kind}` as never)}>
            <Text style={s.title}>{m.title}</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        ))}
        {allowed.length === 0 ? <Text style={s.empty}>No setup screens are assigned to your role.</Text> : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  chev: { fontSize: 22, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30 },
});
