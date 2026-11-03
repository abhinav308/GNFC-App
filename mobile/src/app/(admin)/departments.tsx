import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Header, Pill } from '../../components/AdminList';
import api, { errorMessage } from '../../services/api';

interface Dept {
  id: number;
  name: string;
  is_active: boolean;
  employees: number;
}

// Admin Settings → Department Management (ADMIN role only; the backend enforces it).
export default function Departments() {
  const [rows, setRows] = useState<Dept[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(() => {
    api.get<Dept[]>('/admin/department-master/', { params: { no_page: 1 } }).then((r) => setRows(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = (d: Dept) =>
    Alert.alert('Delete department', `Delete "${d.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => api.delete(`/admin/department-master/${d.id}/`)) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Departments" sub="Admin Settings" back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
        <View style={s.add}>
          <TextInput style={s.input} placeholder="New department" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} maxLength={100} />
          <TouchableOpacity
            style={[s.btn, !name.trim() && { opacity: 0.5 }]}
            disabled={!name.trim()}
            onPress={() => run(async () => { await api.post('/admin/department-master/', { name }); setName(''); })}
          >
            <Text style={s.btnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={s.err}>{error}</Text> : null}
        {rows?.length === 0 ? <Text style={s.empty}>No departments yet.</Text> : null}
        {rows?.map((d) => (
          <View key={d.id} style={s.card}>
            {editing?.id === d.id ? (
              <View style={s.add}>
                <TextInput style={s.input} autoFocus value={editing.name} onChangeText={(t) => setEditing({ id: d.id, name: t })} maxLength={100} />
                <TouchableOpacity style={s.btn} onPress={() => run(async () => { await api.patch(`/admin/department-master/${d.id}/`, { name: editing.name }); setEditing(null); })}>
                  <Text style={s.btnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.row}>
                <Text style={s.name}>{d.name}</Text>
                <Pill text={d.is_active ? 'ACTIVE' : 'INACTIVE'} color={d.is_active ? '#16a34a' : '#64748b'} bg={d.is_active ? '#ecfdf5' : '#f1f5f9'} />
              </View>
            )}
            <Text style={s.meta}>{d.employees} employee{d.employees === 1 ? '' : 's'}</Text>
            <View style={s.actions}>
              <TouchableOpacity onPress={() => setEditing(editing?.id === d.id ? null : { id: d.id, name: d.name })}><Text style={s.link}>{editing?.id === d.id ? 'Cancel' : 'Rename'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => run(() => api.patch(`/admin/department-master/${d.id}/`, { is_active: !d.is_active }))}><Text style={s.link}>{d.is_active ? 'Deactivate' : 'Activate'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(d)}><Text style={[s.link, { color: '#dc2626' }]}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <Text style={s.meta}>Renaming updates every employee in it. A department with employees can't be deleted. Deactivate it instead.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  add: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  btn: { backgroundColor: '#1e3a8a', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  err: { color: '#dc2626', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b' },
  actions: { flexDirection: 'row', gap: 18, marginTop: 4 },
  link: { color: '#1e3a8a', fontWeight: '700', fontSize: 13 },
});
