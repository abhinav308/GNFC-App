import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Header, Pill } from '../../../components/AdminList';
import LiveMapView, { LivePoint } from '../../../components/LiveMapView';
import { timeOf } from '../../../services/format';

const DOWN = new Set(['LOCATION_UNAVAILABLE', 'PERMISSION_DENIED', 'OFFLINE']);

export default function LiveMap() {
  const [pts, setPts] = useState<LivePoint[]>([]);
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Live Map" sub={`${pts.length} on the field`} />
      <LiveMapView style={{ height: 300 }} onPoints={setPts} />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
        {pts.map((p) => (
          <TouchableOpacity key={p.session_id} style={s.row} onPress={() => router.push(`/route/${p.session_id}` as never)} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.display_name}</Text>
              <Text style={s.meta}>Updated {timeOf(p.last_location_at)} · tap for route</Text>
            </View>
            <Pill text={p.tracking_status.replace(/_/g, ' ')} color={DOWN.has(p.tracking_status) ? '#dc2626' : '#16a34a'} bg={DOWN.has(p.tracking_status) ? '#fef2f2' : '#ecfdf5'} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
