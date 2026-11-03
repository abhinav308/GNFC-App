import { useCallback, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import api, { unwrapList } from '../services/api';
import { timeOf } from '../services/format';

export interface LivePoint {
  session_id: number;
  user_id: number;
  display_name: string;
  tracking_status: string;
  last_location_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Everyone who is punched in, on one map. `preview` makes it a still thumbnail for the home screen.
// ponytail: polls on focus + every 15s; the web uses a WebSocket feed.
export default function LiveMapView({ style, preview, onPoints }: { style?: StyleProp<ViewStyle>; preview?: boolean; onPoints?: (p: LivePoint[]) => void }) {
  const [pts, setPts] = useState<LivePoint[]>([]);
  const report = useRef(onPoints);
  report.current = onPoints;

  useFocusEffect(
    useCallback(() => {
      const load = () =>
        api
          .get('/admin/live/')
          .then((r) => {
            const p = unwrapList<LivePoint>(r.data).filter((x) => x.latitude != null);
            setPts(p);
            report.current?.(p);
          })
          .catch(() => {});
      load();
      const t = setInterval(load, 15000);
      return () => clearInterval(t);
    }, []),
  );

  if (!pts.length) {
    return (
      <View style={[style, s.empty]}>
        <Text style={s.emptyText}>No one is currently tracking.</Text>
      </View>
    );
  }

  const lats = pts.map((p) => Number(p.latitude));
  const lngs = pts.map((p) => Number(p.longitude));
  const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2;
  const span = (a: number[]) => Math.max(0.02, (Math.max(...a) - Math.min(...a)) * 1.6);

  return (
    <MapView
      key={pts.length} // fit everyone again when someone punches in or out
      style={style}
      initialRegion={{ latitude: mid(lats), longitude: mid(lngs), latitudeDelta: span(lats), longitudeDelta: span(lngs) }}
      {...(preview ? { scrollEnabled: false, zoomEnabled: false, pitchEnabled: false, rotateEnabled: false } : {})}
    >
      {pts.map((p) => (
        <Marker key={p.session_id} coordinate={{ latitude: Number(p.latitude), longitude: Number(p.longitude) }} title={p.display_name} description={`${p.tracking_status} · updated ${timeOf(p.last_location_at)}`} />
      ))}
    </MapView>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  emptyText: { color: '#64748b' },
});
