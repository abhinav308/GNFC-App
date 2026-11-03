import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdminList, { cardStyles as c, Header, Pill } from '../../../components/AdminList';
import PickerField, { PickOption, PickValue } from '../../../components/PickerField';
import { useAuth } from '../../../hooks/useAuth';
import api, { errorMessage, unwrapList } from '../../../services/api';

interface AUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  has_login: boolean;
  has_active_session: boolean;
  profile?: { employee_id?: string; department?: string };
}

const ROLES: PickOption[] = [
  { value: 'USER', label: 'Field Staff' },
  { value: 'MANAGER', label: 'Manager' },
];
const EMPTY = { employee: null as PickValue | null, username: '', password: '', role: 'USER' as PickValue, access_role: null as PickValue | null };

export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [bump, setBump] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [noLogin, setNoLogin] = useState<PickOption[]>([]);
  const [roles, setRoles] = useState<PickOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pwFor, setPwFor] = useState<number | null>(null);
  const [pw, setPw] = useState('');

  const toggle = async (u: AUser, value: boolean, reload: () => void) => {
    try {
      await api.patch(`/admin/users/${u.id}/`, { is_active: value });
      reload();
    } catch (e) {
      Alert.alert('Failed', errorMessage(e));
    }
  };

  const openForm = async () => {
    const next = !formOpen;
    setFormOpen(next);
    if (!next) return;
    try {
      const [list, opts] = await Promise.all([
        api.get('/admin/users/', { params: { has_login: 0, no_page: 1 } }),
        api.get('/admin/options/'),
      ]);
      setNoLogin(unwrapList<AUser>(list.data).map((u) => ({ value: u.id, label: `${u.full_name || u.username} (${u.profile?.employee_id ?? u.username})` })));
      setRoles(((opts.data.access_roles ?? []) as { id: PickValue; label: string }[]).map((r) => ({ value: r.id, label: r.label })));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const create = async () => {
    setError('');
    if (form.employee == null || !form.username.trim() || !form.password) return setError('Choose an employee, a username and a password.');
    setBusy(true);
    try {
      await api.post('/admin/users/', {
        employee: form.employee,
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        access_role: form.role === 'MANAGER' ? form.access_role : null,
      });
      setForm(EMPTY);
      setFormOpen(false);
      setBump((b) => b + 1);
      Alert.alert('Login created', 'Share the username and password with the employee privately.');
    } catch (e) {
      const d = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(d && typeof d === 'object' ? Object.values(d).flatMap((v) => (Array.isArray(v) ? v : [v])).join(' ') : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const setPassword = async (u: AUser, reload: () => void) => {
    if (pw.length < 8) return Alert.alert('Password', 'Use at least 8 characters.');
    try {
      await api.post(`/admin/users/${u.id}/set-password/`, { new_password: pw });
      setPwFor(null);
      setPw('');
      reload();
      Alert.alert('Password set', `${u.username} must sign in again with the new password.`);
    } catch (e) {
      const d = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
      Alert.alert('Failed', d && typeof d === 'object' ? Object.values(d).flatMap((v) => (Array.isArray(v) ? v : [v])).join(' ') : errorMessage(e));
    }
  };

  return (
    <AdminList<AUser>
      url="/admin/users/"
      params={search ? { search } : undefined}
      reloadKey={`${search}|${bump}`}
      header={
        <Header title="Employees & Users">
          <TextInput
            style={styles.input}
            placeholder="Search name, ID, department"
            placeholderTextColor="#94a3b8"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setSearch(q.trim())}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {isAdmin ? (
            <TouchableOpacity style={styles.addBtn} onPress={openForm}>
              <Text style={styles.addText}>{formOpen ? 'Close' : '＋ Create login'}</Text>
            </TouchableOpacity>
          ) : null}
          {formOpen ? (
            <View style={{ gap: 10, marginTop: 8 }}>
              <PickerField label="Employee (without a login)" required options={noLogin} value={form.employee} onChange={(v) => setForm({ ...form, employee: v as PickValue })} />
              <TextInput style={styles.input2} placeholder="Username *" placeholderTextColor="#94a3b8" autoCapitalize="none" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} />
              <TextInput style={styles.input2} placeholder="Password * (8+ characters)" placeholderTextColor="#94a3b8" secureTextEntry autoCapitalize="none" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
              <PickerField label="User category" required options={ROLES} value={form.role} onChange={(v) => setForm({ ...form, role: v as PickValue })} />
              {form.role === 'MANAGER' ? (
                <PickerField label="Role name (portal access)" options={roles} value={form.access_role} onChange={(v) => setForm({ ...form, access_role: v as PickValue | null })} />
              ) : null}
              {error ? <Text style={styles.err}>{error}</Text> : null}
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#0088ff' }]} onPress={create} disabled={busy}>
                <Text style={[styles.addText, { color: '#fff' }]}>{busy ? 'Creating…' : 'Create login'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Header>
      }
      renderItem={(u, reload) => (
        <View>
          <View style={c.row}>
            <View style={{ flex: 1 }}>
              <Text style={c.name}>{u.full_name || u.username}</Text>
              <Text style={c.meta}>{u.profile?.employee_id ?? u.username} · {u.profile?.department || u.role}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Pill text={u.role} />
                {u.has_active_session ? <Pill text="ON FIELD" color="#16a34a" bg="#ecfdf5" /> : null}
                {u.has_login === false ? <Pill text="NO LOGIN" color="#d97706" bg="#fffbeb" /> : null}
              </View>
            </View>
            <Switch value={u.is_active} onValueChange={(v) => toggle(u, v, reload)} />
          </View>
          {isAdmin && u.has_login !== false ? (
            pwFor === u.id ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TextInput style={[styles.input2, { flex: 1 }]} placeholder="New password" placeholderTextColor="#94a3b8" secureTextEntry autoCapitalize="none" value={pw} onChangeText={setPw} />
                <TouchableOpacity style={styles.saveBtn} onPress={() => setPassword(u, reload)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPwFor(null); setPw(''); }}>
                  <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setPwFor(u.id); setPw(''); }} style={{ marginTop: 8 }}>
                <Text style={styles.link}>Set password</Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  input: { marginTop: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a' },
  input2: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  addBtn: { marginTop: 10, backgroundColor: '#e0f2fe', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addText: { color: '#0369a1', fontWeight: '700' },
  err: { color: '#dc2626', fontSize: 12 },
  link: { color: '#0088ff', fontWeight: '600', fontSize: 13 },
  saveBtn: { backgroundColor: '#0088ff', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
});
