import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header, Pill } from '../../../components/AdminList';
import PickerField, { PickOption, PickValue } from '../../../components/PickerField';
import { useAuth } from '../../../hooks/useAuth';
import api, { errorMessage, unwrapList } from '../../../services/api';
import { MASTERS, MULTI_FIELDS, RELATION_OPTIONS } from '../../../services/masters';
import { can } from '../../../services/permissions';

interface FieldMeta {
  type: string;
  required?: boolean;
  read_only?: boolean;
  label?: string;
  choices?: { value: PickValue; display_name: string }[];
}
type Row = Record<string, unknown> & { id: number };
type Form = Record<string, unknown>;
type OptionLists = Record<string, { id: PickValue; label: string }[]>;
type Page = { results?: Row[]; next?: string | null; count?: number } | Row[];

const humanize = (n: string) => n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const titleOf = (r: Row) => String(r.name_en ?? r.name ?? r.code ?? r.employee_code ?? `#${r.id}`);
const SUB_KEYS = ['code', 'employee_code', 'type', 'office_type', 'agency_type', 'level', 'designation_name', 'office_name', 'company_name', 'district_name', 'zone_name', 'mobile'];

export default function Master() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const def = MASTERS.find((m) => m.kind === kind);
  const { user } = useAuth();
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<Row | null>(null);

  if (!def) return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}><Header title="Setup" back /><Text style={s.empty}>Unknown setup screen.</Text></View>;
  if (!can(user, def.screen)) return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}><Header title={def.title} back /><Text style={s.empty}>You do not have access to this screen.</Text></View>;

  return mode === 'list' ? (
    <MasterList def={def} onOpen={(r) => { setEditing(r); setMode('form'); }} onAdd={() => { setEditing(null); setMode('form'); }} />
  ) : (
    <MasterForm def={def} row={editing} onDone={() => setMode('list')} />
  );
}

/* ---------------------------------- list ---------------------------------- */

function MasterList({ def, onOpen, onAdd }: { def: (typeof MASTERS)[number]; onOpen: (r: Row) => void; onAdd: () => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const [count, setCount] = useState(0);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<Page>(def.endpoint, { params: { search: search || undefined, page_size: 50 } });
      setRows(unwrapList<Row>(data));
      setNext(Array.isArray(data) ? null : data.next ?? null);
      setPageNo(1);
      setCount(Array.isArray(data) ? data.length : data.count ?? 0);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [def.endpoint, search]);

  useEffect(() => {
    load();
  }, [load]);

  const more = async () => {
    if (!next) return;
    try {
      const { data } = await api.get<Page>(def.endpoint, { params: { search: search || undefined, page: pageNo + 1 } });
      setRows((r) => [...r, ...unwrapList<Row>(data)]);
      setNext(Array.isArray(data) ? null : data.next ?? null);
      setPageNo(pageNo + 1);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title={def.title} sub={`${count} record${count === 1 ? '' : 's'}`} back>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TextInput
            style={[s.input, { flex: 1, marginTop: 0 }]}
            placeholder="Search"
            placeholderTextColor="#94a3b8"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setSearch(q.trim())}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {can(user, def.screen, 'add') ? (
            <TouchableOpacity style={s.addBtn} onPress={onAdd}>
              <Text style={s.addText}>＋ Add</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Header>
      {error ? <Text style={s.err}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0088ff" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          onEndReached={more}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={s.empty}>Nothing here yet.</Text>}
          renderItem={({ item }) => {
            const subs = SUB_KEYS.map((k) => item[k]).filter((v) => typeof v === 'string' && v).slice(0, 3) as string[];
            return (
              <TouchableOpacity style={s.card} onPress={() => onOpen(item)}>
                <View style={s.rowTop}>
                  <Text style={s.cardTitle} numberOfLines={2}>{titleOf(item)}</Text>
                  {typeof item.status === 'string' ? <Pill text={item.status} color={item.status === 'ACTIVE' ? '#16a34a' : '#64748b'} bg={item.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9'} /> : null}
                </View>
                {subs.length ? <Text style={s.meta}>{subs.join(' · ')}</Text> : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

/* ---------------------------------- form ---------------------------------- */

function MasterForm({ def, row, onDone }: { def: (typeof MASTERS)[number]; row: Row | null; onDone: () => void }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState<Record<string, FieldMeta> | null>(null);
  const [opts, setOpts] = useState<OptionLists>({});
  const [form, setForm] = useState<Form>(row ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.request({ method: 'OPTIONS', url: def.endpoint }).then((r) => {
      const post = (r.data?.actions?.POST ?? {}) as Record<string, FieldMeta>;
      setMeta(post);
      if (!row && post.status?.choices?.some((c) => c.value === 'ACTIVE')) setForm((f) => ({ status: 'ACTIVE', ...f }));
    }).catch((e) => setBanner(errorMessage(e)));
    api.get('/admin/options/').then((r) => setOpts(r.data as OptionLists)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.endpoint]);

  const relationOptions = (name: string): PickOption[] | null => {
    const lists = name === 'reports_to' ? (def.kind === 'employees' ? ['employees'] : ['zones', 'districts']) : RELATION_OPTIONS[name] ? [RELATION_OPTIONS[name]] : [];
    if (!lists.length) return null;
    return lists.flatMap((l) => opts[l] ?? []).filter((o) => o.id !== row?.id || name !== 'reports_to').map((o) => ({ value: o.id, label: o.label }));
  };

  const fields = Object.entries(meta ?? {}).filter(([name, m]) => !m.read_only && m.type !== 'image upload' && !(m.type === 'field' && !relationOptions(name)));
  const set = (name: string, v: unknown) => setForm((f) => ({ ...f, [name]: v }));

  const submit = async () => {
    setBanner('');
    const missing: Record<string, string> = {};
    const body: Record<string, unknown> = {};
    for (const [name, m] of fields) {
      let v = form[name];
      if (m.type === 'boolean') v = !!v;
      const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0 && !MULTI_FIELDS.has(name));
      if (m.required && empty) missing[name] = 'This field is required.';
      if (['integer', 'float', 'decimal'].includes(m.type)) v = empty ? null : Number(v);
      else if (m.type === 'field' && !MULTI_FIELDS.has(name)) v = empty ? null : v;
      else if (m.type === 'date' && empty) v = null;
      else if (m.type === 'string' || m.type === 'email') v = v ?? '';
      if (v !== undefined) body[name] = v;
    }
    setErrors(missing);
    if (Object.keys(missing).length) return setBanner('Fill in the required fields.');
    setBusy(true);
    try {
      if (row) await api.patch(`${def.endpoint}${row.id}/`, body);
      else await api.post(def.endpoint, body);
      onDone();
    } catch (e) {
      const d = (e as { response?: { data?: unknown } })?.response?.data;
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(d as Record<string, unknown>)) if (k !== 'detail') fe[k] = (Array.isArray(v) ? v : [v]).join(' ');
        setErrors(fe);
        setBanner((d as { detail?: string }).detail ?? 'Some fields need attention.');
      } else {
        setBanner(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete', `Delete ${titleOf(row as Row)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`${def.endpoint}${(row as Row).id}/`);
            onDone();
          } catch (e) {
            Alert.alert('Could not delete', errorMessage(e));
          }
        },
      },
    ]);

  const canSave = can(user, def.screen, row ? 'edit' : 'add');

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title={row ? `Edit ${def.title}` : `New ${def.title}`} sub={row ? titleOf(row) : undefined}>
        <TouchableOpacity onPress={onDone} style={{ alignSelf: 'flex-start', paddingVertical: 4 }} accessibilityRole="button">
          <Text style={s.back}>‹ Back to list</Text>
        </TouchableOpacity>
      </Header>
      {!meta ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0088ff" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          {banner ? <Text style={s.err}>{banner}</Text> : null}
          {fields.map(([name, m]) => {
            const label = m.label && m.label !== name ? m.label : humanize(name);
            const err = errors[name];
            if (m.type === 'choice') {
              const choices = (m.choices ?? []).map((c) => ({ value: c.value, label: c.display_name }));
              return <PickerField key={name} label={label} required={m.required} options={choices} value={form[name] as PickValue} onChange={(v) => set(name, v)} error={err} />;
            }
            if (m.type === 'field') {
              return <PickerField key={name} label={label} required={m.required} multi={MULTI_FIELDS.has(name)} options={relationOptions(name) ?? []} value={form[name] as PickValue | PickValue[]} onChange={(v) => set(name, v)} error={err} />;
            }
            if (m.type === 'boolean') {
              return (
                <View key={name} style={s.switchRow}>
                  <Text style={s.label}>{label}</Text>
                  <Switch value={!!form[name]} onValueChange={(v) => set(name, v)} />
                </View>
              );
            }
            const numeric = ['integer', 'float', 'decimal'].includes(m.type);
            return (
              <View key={name} style={{ gap: 4 }}>
                <Text style={s.label}>{label}{m.required ? <Text style={{ color: '#dc2626' }}> *</Text> : null}</Text>
                <TextInput
                  style={[s.input, { marginTop: 0 }, /address/.test(name) && { minHeight: 70, textAlignVertical: 'top' }, err ? { borderColor: '#dc2626' } : null]}
                  value={form[name] == null ? '' : String(form[name])}
                  onChangeText={(v) => set(name, v)}
                  placeholder={m.type === 'date' ? 'YYYY-MM-DD' : undefined}
                  placeholderTextColor="#94a3b8"
                  multiline={/address/.test(name)}
                  autoCapitalize="none"
                  keyboardType={numeric ? 'numbers-and-punctuation' : m.type === 'email' ? 'email-address' : name.includes('mobile') || name.includes('phone') ? 'phone-pad' : 'default'}
                />
                {err ? <Text style={s.fieldErr}>{err}</Text> : null}
              </View>
            );
          })}
          {canSave ? (
            <TouchableOpacity style={[s.saveBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              <Text style={s.saveText}>{busy ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          ) : null}
          {row && can(user, def.screen, 'delete') ? (
            <TouchableOpacity style={s.delBtn} onPress={remove}>
              <Text style={s.delText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  input: { marginTop: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  addBtn: { backgroundColor: '#0088ff', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b' },
  err: { color: '#dc2626', paddingHorizontal: 16, paddingTop: 8, fontSize: 13 },
  fieldErr: { color: '#dc2626', fontSize: 12 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  back: { color: '#0088ff', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saveBtn: { backgroundColor: '#0088ff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  delBtn: { backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  delText: { color: '#dc2626', fontWeight: '800' },
});
