import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Header } from '../../components/AdminList';
import PickerField, { PickOption, PickValue } from '../../components/PickerField';
import api, { errorMessage } from '../../services/api';

interface Created {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  email_sent: boolean;
}
const EMPTY = { name: '', email: '', mobile: '', designation: null as PickValue | null, office: null as PickValue | null };

export default function NewEmployee() {
  const [form, setForm] = useState(EMPTY);
  const [designations, setDesignations] = useState<PickOption[]>([]);
  const [offices, setOffices] = useState<PickOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    api.get('/admin/options/').then((r) => {
      const opt = (k: string): PickOption[] => ((r.data[k] ?? []) as { id: PickValue; label: string }[]).map((o) => ({ value: o.id, label: o.label }));
      setDesignations(opt('designations'));
      setOffices(opt('offices'));
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required. The temporary password is sent to the email.');
    setBusy(true);
    try {
      const body: Record<string, unknown> = { name: form.name.trim(), email: form.email.trim() };
      if (form.mobile.trim()) body.mobile = form.mobile.trim();
      if (form.designation != null) body.designation = form.designation;
      if (form.office != null) body.office = form.office;
      setCreated((await api.post<Created>('/admin/employees/onboard/', body)).data);
    } catch (e) {
      const d = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(d && typeof d === 'object' ? Object.values(d).flatMap((v) => (Array.isArray(v) ? v : [v])).join(' ') : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <Header title="Employee created" back />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={s.card}>
            <Text style={s.label}>EC number</Text>
            <Text style={s.code} selectable>{created.employee_code}</Text>
            <Text style={s.name}>{created.name}</Text>
            {created.email_sent ? (
              <Text style={s.ok}>The EC number and a temporary password were emailed to {created.email}. {created.name} must choose a new password at first sign-in.</Text>
            ) : (
              <Text style={s.warn}>The employee was created, but the email could not be sent. Open the employee and use "Reset password and email it" once the mail settings are fixed.</Text>
            )}
          </View>
          <TouchableOpacity style={s.btn} onPress={() => router.replace(`/employee/${created.id}` as never)}>
            <Text style={s.btnText}>Open employee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn2} onPress={() => { setCreated(null); setForm(EMPTY); }}>
            <Text style={s.btn2Text}>Add another employee</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="New employee" sub="The EC number is generated for you and emailed with a temporary password." back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Text style={s.fieldLabel}>Name <Text style={{ color: '#dc2626' }}>*</Text></Text>
          <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.fieldLabel}>Email <Text style={{ color: '#dc2626' }}>*</Text></Text>
          <TextInput style={s.input} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.fieldLabel}>Mobile</Text>
          <TextInput style={s.input} value={form.mobile} onChangeText={(v) => setForm({ ...form, mobile: v })} keyboardType="phone-pad" />
        </View>
        <PickerField label="Designation" options={designations} value={form.designation} onChange={(v) => setForm({ ...form, designation: v as PickValue | null })} />
        <PickerField label="Office" options={offices} value={form.office} onChange={(v) => setForm({ ...form, office: v as PickValue | null })} />
        {error ? <Text style={s.err}>{error}</Text> : null}
        <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={s.btnText}>{busy ? 'Creating…' : 'Generate EC number and email login'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', gap: 6, alignItems: 'center' },
  label: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  code: { fontSize: 34, fontWeight: '800', color: '#0f172a', letterSpacing: 1 },
  name: { fontSize: 15, color: '#334155', fontWeight: '600' },
  ok: { fontSize: 13, color: '#047857', textAlign: 'center', marginTop: 6 },
  warn: { fontSize: 13, color: '#b45309', textAlign: 'center', marginTop: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  err: { color: '#dc2626', fontSize: 13 },
  btn: { backgroundColor: '#0088ff', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btn2: { backgroundColor: '#e0f2fe', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btn2Text: { color: '#0369a1', fontWeight: '700' },
});
