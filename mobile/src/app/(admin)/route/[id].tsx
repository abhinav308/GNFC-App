import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Header, Pill } from '../../../components/AdminList';
import api, { errorMessage } from '../../../services/api';
import { dur, isMissingPunchOut, timeOf, when } from '../../../services/format';
import type { Sess } from '../../../components/SessionsList';

interface Point {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}
interface Ev {
  id: number;
  event_type: string;
  timestamp: string;
}
interface Detail {
  session: Sess;
  locations: Point[];
  events: Ev[];
}

const label = (v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
// Events that mean the phone stopped reporting its location.
const INTERRUPTION = new Set(['LOCATION_UNAVAILABLE', 'LOCATION_PERMISSION_DENIED']);

// One shift: where the employee went (the route on the map), when the location stopped coming in, and the event timeline.
export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setError('');
      api
        .get<Detail>(`/admin/sessions/${id}/`)
        .then((r) => setData(r.data))
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false));
    }, [id]),
  );

  const sess = data?.session;
  const pts = (data?.locations ?? []).map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }));
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2;
  const span = (a: number[]) => Math.max(0.01, (Math.max(...a) - Math.min(...a)) * 1.6);
  const gaps = (data?.events ?? []).filter((e) => INTERRUPTION.has(e.event_type));

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title={sess?.display_name ?? 'Shift route'} sub={sess ? `${sess.employee_id ?? ''} · ${new Date(sess.punch_in_at).toLocaleDateString()}` : undefined} back />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0088ff" />
      ) : !sess ? (
        <Text style={s.err}>{error || 'Shift not found.'}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={s.card}>
            <View style={s.rowBetween}>
              {isMissingPunchOut(sess) ? <Pill text="MISSING PUNCH-OUT" color="#dc2626" bg="#fef2f2" /> : <Pill text={sess.status} color={sess.status === 'ACTIVE' ? '#16a34a' : '#64748b'} bg={sess.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'} />}
              <Text style={s.meta}>{pts.length} location point{pts.length === 1 ? '' : 's'}</Text>
            </View>
            <Text style={s.line}>In: {when(sess.punch_in_at)}</Text>
            <Text style={s.line}>Out: {when(sess.punch_out_at)}</Text>
            <Text style={s.line}>Working time: {dur(sess.duration_seconds)}</Text>
            <Text style={s.line}>Tracking: {label(sess.tracking_status)}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.h}>Route</Text>
            {pts.length === 0 ? (
              <Text style={s.meta}>No location points were recorded for this shift.</Text>
            ) : (
              <MapView
                style={s.map}
                initialRegion={{ latitude: mid(lats), longitude: mid(lngs), latitudeDelta: span(lats), longitudeDelta: span(lngs) }}
              >
                <Polyline coordinates={pts} strokeColor="#0088ff" strokeWidth={4} />
                <Marker coordinate={pts[0]} title="Start" description={timeOf(data?.locations[0]?.timestamp)} pinColor="green" />
                {pts.length > 1 ? (
                  <Marker coordinate={pts[pts.length - 1]} title={sess.status === 'ACTIVE' ? 'Last seen' : 'End'} description={timeOf(data?.locations[pts.length - 1]?.timestamp)} pinColor="red" />
                ) : null}
              </MapView>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.h}>Location interruptions ({gaps.length})</Text>
            {gaps.length === 0 ? <Text style={s.meta}>None. The location kept coming in.</Text> : null}
            {gaps.map((e) => (
              <Text key={e.id} style={[s.line, { color: '#b91c1c' }]}>{timeOf(e.timestamp)} · {label(e.event_type)}</Text>
            ))}
          </View>

          {data?.events.length ? (
            <View style={s.card}>
              <Text style={s.h}>Timeline</Text>
              {data.events.map((e) => (
                <Text key={e.id} style={s.line}>{timeOf(e.timestamp)} · {label(e.event_type)}</Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  line: { fontSize: 13, color: '#334155' },
  meta: { fontSize: 12, color: '#64748b' },
  map: { height: 300, borderRadius: 10, overflow: 'hidden' },
  err: { color: '#dc2626', padding: 16 },
});
