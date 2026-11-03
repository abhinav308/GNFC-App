import { ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { initials } from '../../../components/AppHeader';
import { useOnDuty } from '../../../duty';
import { useAuth } from '../../../hooks/useAuth';
import { useT } from '../../../i18n';

type Href = '/history' | '/password' | '/language';

function Tile({ icon, title, sub, href, badge, danger, onPress }: { icon: string; title: string; sub: string; href?: Href; badge?: string; danger?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity style={[styles.tile, danger && { borderColor: '#fecdd3' }]} onPress={onPress ?? (() => router.push(href! as never))}>
      <View style={[styles.tileIcon, danger && { backgroundColor: '#fff1f2' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tileTitle, danger && { color: '#e11d48' }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.tileSub, danger && { color: '#fb7185' }]} numberOfLines={1}>{sub}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const Section = ({ title, children, full }: { title: string; children: ReactNode; full?: boolean }) => (
  <View style={{ marginBottom: 18 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={[styles.grid, full && { flexDirection: 'column' }]}>{children}</View>
  </View>
);

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t } = useT();
  const onDuty = useOnDuty();

  const doLogout = () => {
    logout();
    router.replace('/login');
  };
  // Logging out stops tracking, so warn when a shift is still running.
  const confirmLogout = () =>
    onDuty
      ? Alert.alert(t('onDuty'), t('logoutOnDuty'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('logoutAnyway'), style: 'destructive', onPress: doLogout },
        ])
      : doLogout();

  const name = user?.full_name || user?.username || '';
  const p = user?.profile;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.role}>{p?.designation || 'Field Officer'}</Text>
          <Text style={styles.meta}>ID: {p?.employee_id || user?.username}</Text>
          <Text style={styles.meta} numberOfLines={1}>{p?.department || '—'}</Text>
        </View>
      </View>

      <Section title={t('myWork')}>
        <Tile icon="🗓" title={t('viewAttendance')} sub="Calendar & logs" href="/history" />
      </Section>
      <Section title={t('account')}>
        <Tile icon="🔑" title={t('password')} sub="Change login key" href="/password" />
        <Tile icon="🌐" title={t('language')} sub="EN / HI / GJ" href="/language" />
        <Tile danger icon="⎋" title={t('logout')} sub="Exit application" onPress={confirmLogout} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 14 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#00c696', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#d1fae5' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  role: { fontSize: 13, fontWeight: '700', color: '#059669' },
  meta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  tileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  tileSub: { fontSize: 10, color: '#94a3b8' },
  badge: { backgroundColor: '#f43f5e', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
