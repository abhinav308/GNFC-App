import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useT } from '../i18n';
import api, { errorMessage } from '../services/api';

// The backend answers {"new_password": ["too common", ...]}; show just the sentences.
function serverMessage(e: unknown): string {
  const d = (e as { response?: { data?: unknown } })?.response?.data;
  if (d && typeof d === 'object') {
    const msgs = Object.values(d as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : [v])).filter((v) => typeof v === 'string');
    if (msgs.length) return msgs.join(' ');
  }
  return errorMessage(e);
}

// Used by both the staff and the admin app. Changing the password signs the account out everywhere, so we log in again.
export default function ChangePasswordForm() {
  const { t } = useT();
  const { logout } = useAuth();
  const [old, setOld] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!old || !next || !again) return setError(t('pwEmpty'));
    if (next.length < 8) return setError(t('pwShort'));
    if (next === old) return setError(t('pwSame'));
    if (next !== again) return setError(t('pwMismatch'));
    setBusy(true);
    try {
      await api.post('/auth/change-password/', { old_password: old, new_password: next });
      Alert.alert(t('changePassword'), t('pwDone'), [{ text: t('ok'), onPress: logout }], { cancelable: false });
    } catch (e) {
      setError(serverMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    [t('currentPassword'), old, setOld],
    [t('newPassword'), next, setNext],
    [t('confirmPassword'), again, setAgain],
  ] as const;

  return (
    <View style={s.card}>
      {fields.map(([ph, v, set]) => (
        <TextInput
          key={ph}
          style={s.input}
          placeholder={ph}
          placeholderTextColor="#94a3b8"
          secureTextEntry={!show}
          value={v}
          onChangeText={set}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ))}
      <TouchableOpacity onPress={() => setShow(!show)} accessibilityRole="button">
        <Text style={s.link}>{show ? t('hide') : t('show')}</Text>
      </TouchableOpacity>
      <Text style={s.hint}>{t('pwHint')}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>{t('changePassword')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#0f172a' },
  link: { color: '#0088ff', fontWeight: '600', fontSize: 13 },
  hint: { fontSize: 11, color: '#64748b' },
  error: { color: '#dc2626', fontSize: 12 },
  btn: { backgroundColor: '#00c696', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
