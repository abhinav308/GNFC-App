import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Header, Pill } from '../../../components/AdminList';
import AuthImage from '../../../components/AuthImage';
import { useAuth } from '../../../hooks/useAuth';
import api, { errorMessage } from '../../../services/api';
import { can } from '../../../services/permissions';
import type { Visit } from '../../../types';

interface Detail {
  visit: Visit & { employee_name?: string; employee_id?: string; department?: string; photos?: { id: number; caption: string; photo_url: string | null }[] };
  events: { id: number; event_type: string; timestamp: string }[];
}

const STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const OUTCOMES = ['PENDING', 'SATISFACTORY', 'ACTION_REQUIRED', 'FOLLOW_UP_NEEDED', 'CANCELLED'];
const label = (v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');

export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const canEdit = can(user, 'attendance.visits', 'edit');
  const canDelete = can(user, 'attendance.visits', 'delete');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: d } = await api.get<Detail>(`/admin/visits/${id}/`);
      setData(d);
      setStatus(d.visit.status);
      setOutcome(d.visit.outcome ?? 'PENDING');
      setNotes(d.visit.notes ?? '');
      setOutcomeNotes(d.visit.outcome_notes ?? '');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/visits/${id}/manage/`, { status, outcome, notes, outcome_notes: outcomeNotes });
      await load();
      Alert.alert('Saved', 'Visit updated.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete visit', 'This removes the visit and its photos. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/visits/${id}/manage/`);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', errorMessage(e));
          }
        },
      },
    ]);

  const v = data?.visit;
  const chips = (values: string[], current: string, set: (x: string) => void) => (
    <View style={s.chips}>
      {values.map((x) => (
        <TouchableOpacity key={x} disabled={!canEdit} style={[s.chip, current === x && s.chipOn]} onPress={() => set(x)}>
          <Text style={[s.chipText, current === x && { color: '#fff' }]}>{label(x)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title={v?.site_name ?? 'Field visit'} sub={v ? `${v.employee_name ?? ''} ${v.employee_id ? '· ' + v.employee_id : ''}` : undefined} back />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0088ff" />
      ) : !v ? (
        <Text style={s.err}>{error || 'Visit not found.'}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          {error ? <Text style={s.err}>{error}</Text> : null}
          <View style={s.card}>
            <View style={s.top}>
              <Pill text={label(v.status)} color={v.status === 'COMPLETED' ? '#16a34a' : '#d97706'} bg={v.status === 'COMPLETED' ? '#ecfdf5' : '#fffbeb'} />
              {v.visit_type ? <Pill text={label(v.visit_type)} /> : null}
            </View>
            {v.project_name ? <Text style={s.line}>Project: {v.project_name}</Text> : null}
            {v.department ? <Text style={s.line}>Department: {v.department}</Text> : null}
            <Text style={s.line}>Started: {fmt(v.start_time)}</Text>
            <Text style={s.line}>Ended: {fmt(v.end_time)}{v.duration_minutes != null ? ` · ${v.duration_minutes} min` : ''}</Text>
            {v.latitude != null && v.longitude != null ? (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${v.latitude},${v.longitude}`)}>
                <Text style={s.link}>📍 Start location: {v.latitude}, {v.longitude}</Text>
              </TouchableOpacity>
            ) : null}
            {v.end_latitude != null && v.end_longitude != null ? (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${v.end_latitude},${v.end_longitude}`)}>
                <Text style={s.link}>📍 End location: {v.end_latitude}, {v.end_longitude}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {v.photos?.length ? (
            <View style={s.card}>
              <Text style={s.h}>Photos ({v.photos.length})</Text>
              <View style={s.photos}>
                {v.photos.map((p) => (p.photo_url ? <AuthImage key={p.id} path={p.photo_url} style={s.photo} /> : null))}
              </View>
            </View>
          ) : null}

          <View style={s.card}>
            <Text style={s.h}>Review</Text>
            <Text style={s.sub}>Status</Text>
            {chips(STATUSES, status, setStatus)}
            <Text style={s.sub}>Outcome</Text>
            {chips(OUTCOMES, outcome, setOutcome)}
            <Text style={s.sub}>Officer notes</Text>
            <TextInput style={s.input} multiline value={notes} onChangeText={setNotes} editable={canEdit} placeholder="Notes" placeholderTextColor="#94a3b8" />
            <Text style={s.sub}>Outcome notes</Text>
            <TextInput style={s.input} multiline value={outcomeNotes} onChangeText={setOutcomeNotes} editable={canEdit} placeholder="Outcome notes" placeholderTextColor="#94a3b8" />
            {canEdit ? (
              <TouchableOpacity style={[s.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                <Text style={s.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
              </TouchableOpacity>
            ) : null}
            {canDelete ? (
              <TouchableOpacity style={s.del} onPress={remove}>
                <Text style={s.delText}>Delete visit</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {data?.events?.length ? (
            <View style={s.card}>
              <Text style={s.h}>Timeline</Text>
              {data.events.map((e) => (
                <Text key={e.id} style={s.line}>{fmt(e.timestamp)} · {label(e.event_type)}</Text>
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
  top: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  line: { fontSize: 13, color: '#475569' },
  link: { fontSize: 13, color: '#0088ff', fontWeight: '600' },
  h: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#0088ff', borderColor: '#0088ff' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 96, height: 96, borderRadius: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, minHeight: 64, textAlignVertical: 'top', color: '#0f172a', fontSize: 14 },
  save: { backgroundColor: '#0088ff', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '800' },
  del: { backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  delText: { color: '#dc2626', fontWeight: '800' },
  err: { color: '#dc2626', padding: 16 },
});
