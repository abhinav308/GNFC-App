import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Header } from '../../components/AdminList';
import { useAuth } from '../../hooks/useAuth';
import api, { errorMessage } from '../../services/api';
import { when } from '../../services/format';

interface SecurityData {
  policy: { access_token_minutes: number; refresh_token_days: number; refresh_rotation: boolean; min_password_length: number };
  sessions: { user_id: number; username: string; name: string; role: string; devices: number; signed_in_since: string }[];
}
interface AuditRow { id: number; actor_name: string; action: string; target: string; detail: string; created_at: string }
interface AuditPage { results: AuditRow[]; next: string | null }

// Session & Security Settings and the audit trail (ADMIN role only; the backend enforces it).
export default function Security() {
  const { user } = useAuth();
  const [data, setData] = useState<SecurityData | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const loadSessions = useCallback(() => {
    api.get<SecurityData>('/admin/security/').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(loadSessions, [loadSessions]);

  const loadAudit = useCallback(async (p: number, search: string, replace: boolean) => {
    try {
      const r = await api.get<AuditPage>('/admin/audit/', { params: { page: p, search: search || undefined } });
      setAudit((prev) => (replace ? r.data.results : [...prev, ...r.data.results]));
      setMore(!!r.data.next);
      setPage(p);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => loadAudit(1, q, true), 300);
    return () => clearTimeout(t);
  }, [q, loadAudit]);

  const signOut = (id: number, name: string) =>
    Alert.alert('Sign out', `Sign ${name} out of every device? They will need to log in again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/admin/security/sign-out/${id}/`);
            loadSessions();
            loadAudit(1, q, true);
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);

  const p = data?.policy;
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Header title="Session & Security" sub="Admin Settings" back />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {error ? <Text style={s.err}>{error}</Text> : null}

        <View style={s.card}>
          <Text style={s.h}>Security policy</Text>
          {p ? (
            <>
              <Text style={s.line}>Access token: {p.access_token_minutes} minutes</Text>
              <Text style={s.line}>Login lasts: {p.refresh_token_days} days{p.refresh_rotation ? ' (rotating)' : ''}</Text>
              <Text style={s.line}>Minimum password: {p.min_password_length} characters</Text>
              <Text style={s.line}>Temporary passwords must be changed at first sign-in</Text>
            </>
          ) : null}
          <Text style={s.meta}>Set on the server. Changing them needs a redeploy.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.h}>Active sign-ins ({data?.sessions.length ?? '…'})</Text>
          {data?.sessions.length === 0 ? <Text style={s.meta}>Nobody is signed in.</Text> : null}
          {data?.sessions.map((x) => (
            <View key={x.user_id} style={s.sess}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{x.name} · {x.username}</Text>
                <Text style={s.meta}>{x.role} · {x.devices} open login{x.devices === 1 ? '' : 's'} · since {when(x.signed_in_since)}</Text>
              </View>
              {x.user_id === user?.id ? <Text style={s.meta}>You</Text> : (
                <TouchableOpacity onPress={() => signOut(x.user_id, x.name)}><Text style={s.danger}>Sign out</Text></TouchableOpacity>
              )}
            </View>
          ))}
          <Text style={s.meta}>A signed-out user can keep working until their access token expires (up to {p?.access_token_minutes ?? 15} minutes).</Text>
        </View>

        <View style={s.card}>
          <Text style={s.h}>Audit trail</Text>
          <Text style={s.meta}>Sensitive admin actions. Records can't be edited or deleted.</Text>
          <TextInput style={s.input} placeholder="Search who, action or target" placeholderTextColor="#94a3b8" value={q} onChangeText={setQ} autoCapitalize="none" />
          {audit.length === 0 ? <Text style={s.meta}>No audit records yet.</Text> : null}
          {audit.map((a) => (
            <View key={a.id} style={s.audit}>
              <Text style={s.action}>{a.action.replace(/_/g, ' ')}</Text>
              <Text style={s.line}>{a.actor_name}{a.target ? ` → ${a.target}` : ''}{a.detail ? ` (${a.detail})` : ''}</Text>
              <Text style={s.meta}>{when(a.created_at)}</Text>
            </View>
          ))}
          {more ? <TouchableOpacity onPress={() => loadAudit(page + 1, q, false)}><Text style={s.link}>Load older</Text></TouchableOpacity> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  h: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  line: { fontSize: 13, color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b' },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sess: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  danger: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  err: { color: '#dc2626', fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#0f172a' },
  audit: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, gap: 2 },
  action: { fontSize: 11, fontWeight: '800', color: '#1d4ed8' },
  link: { color: '#1e3a8a', fontWeight: '700', fontSize: 13 },
});
