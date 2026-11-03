import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import AdminList, { cardStyles as c, Header, Pill } from '../../../components/AdminList';
import SessionsList from '../../../components/SessionsList';
import { useAuth } from '../../../hooks/useAuth';
import { when } from '../../../services/format';
import { can } from '../../../services/permissions';
import type { Visit } from '../../../types';

type AVisit = Visit & { display_name?: string; employee_name?: string };

export default function Attendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'sessions' | 'visits'>(can(user, 'attendance.sessions') ? 'sessions' : 'visits');

  const toggle = (
    <Header title="Attendance & Visits">
      <View style={styles.seg}>
        {(['sessions', 'visits'] as const)
          .filter((t) => can(user, t === 'sessions' ? 'attendance.sessions' : 'attendance.visits'))
          .map((t) => (
            <TouchableOpacity key={t} style={[styles.segBtn, tab === t && styles.segOn]} onPress={() => setTab(t)}>
              <Text style={{ color: tab === t ? '#fff' : '#475569', fontWeight: '600' }}>
                {t === 'sessions' ? 'Records' : 'Field Visits'}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    </Header>
  );

  return tab === 'sessions' ? (
    <SessionsList header={toggle} />
  ) : (
    <AdminList<AVisit>
      url="/admin/visits/"
      header={toggle}
      renderItem={(v) => (
        <TouchableOpacity onPress={() => router.push(`/visit/${v.id}` as never)} accessibilityRole="button">
          <View style={c.row}>
            <Text style={c.name}>{v.site_name}</Text>
            <Pill text={v.status} />
          </View>
          <Text style={c.meta}>{v.display_name ?? v.employee_name ?? ''}</Text>
          <Text style={c.meta}>{v.location_name} · {when(v.start_time)}</Text>
          {v.outcome ? <Text style={c.meta}>Outcome: {v.outcome}</Text> : null}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 8, marginTop: 10 },
  segBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  segOn: { backgroundColor: '#0088ff' },
});
