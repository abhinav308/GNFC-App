import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type PickValue = string | number;
export interface PickOption {
  value: PickValue;
  label: string;
}

// A dropdown: shows the current choice, and opens a searchable list. `multi` keeps the sheet open and returns an array.
export default function PickerField({
  label,
  required,
  options,
  value,
  onChange,
  multi,
  error,
}: {
  label: string;
  required?: boolean;
  options: PickOption[];
  value: PickValue | PickValue[] | null | undefined;
  onChange: (v: PickValue | PickValue[] | null) => void;
  multi?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = multi ? ((value as PickValue[] | null) ?? []) : value != null && value !== '' ? [value as PickValue] : [];
  const text = selected.length
    ? selected.map((v) => options.find((o) => o.value === v)?.label ?? String(v)).join(', ')
    : '';
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = (v: PickValue) => {
    if (multi) {
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    } else {
      onChange(v);
      setOpen(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={{ color: '#dc2626' }}> *</Text> : null}
      </Text>
      <TouchableOpacity style={[s.box, error ? { borderColor: '#dc2626' } : null]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={[s.boxText, !text && { color: '#94a3b8' }]} numberOfLines={1}>
          {text || '—'}
        </Text>
        <Text style={s.chev}>▾</Text>
      </TouchableOpacity>
      {error ? <Text style={s.err}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={s.done}>{multi ? 'Done' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={s.search} placeholder="Search" placeholderTextColor="#94a3b8" value={q} onChangeText={setQ} autoCapitalize="none" />
          {!required && !multi ? (
            <TouchableOpacity
              style={s.row}
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Text style={[s.rowText, { color: '#64748b' }]}>— None —</Text>
            </TouchableOpacity>
          ) : null}
          <FlatList
            data={shown}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={s.empty}>No options.</Text>}
            renderItem={({ item }) => {
              const on = selected.includes(item.value);
              return (
                <TouchableOpacity style={[s.row, on && { backgroundColor: '#eff6ff' }]} onPress={() => pick(item.value)}>
                  <Text style={s.rowText}>{item.label}</Text>
                  {on ? <Text style={s.tick}>✓</Text> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155' },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff' },
  boxText: { flex: 1, fontSize: 14, color: '#0f172a' },
  chev: { color: '#64748b', marginLeft: 8 },
  err: { color: '#dc2626', fontSize: 12 },
  sheet: { flex: 1, backgroundColor: '#fff', paddingTop: 48 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  done: { color: '#0088ff', fontWeight: '700', fontSize: 15 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  rowText: { fontSize: 15, color: '#0f172a', flex: 1 },
  tick: { color: '#0088ff', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30 },
});
