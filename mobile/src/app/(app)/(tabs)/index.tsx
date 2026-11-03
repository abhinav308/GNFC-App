import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import SelfieCamera, { SelfieAsset } from '../../../components/SelfieCamera';
import { setOnDuty } from '../../../duty';
import { useT } from '../../../i18n';
import api, { errorMessage, unwrapList } from '../../../services/api';
import { requestTrackingPermissions, startTracking, stopTracking, getCurrentPoint, getQuickPoint } from '../../../services/tracking';
import { useAuth } from '../../../hooks/useAuth';
import type { Session } from '../../../types';

function formatShortDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Start location tracking without making the screen wait for permission dialogs.
function beginTracking() {
  requestTrackingPermissions()
    .then((perm) => (perm.granted ? startTracking() : Alert.alert('Limited tracking', perm.reason ?? 'Background location was not granted.')))
    .catch(() => {});
}

function trackingBadge(status: string | undefined, t: (k: string) => string) {
  if (status === 'ACTIVE') return { bg: '#ecfdf5', fg: '#16a34a', label: t('trackActive') };
  if (status === 'PAUSED') return { bg: '#fffbeb', fg: '#d97706', label: t('trackPaused') };
  if (status === 'PUNCHED_OUT') return { bg: '#f1f5f9', fg: '#64748b', label: t('trackPunchedOut') };
  // LOCATION_UNAVAILABLE, PERMISSION_DENIED, OFFLINE: all read as an obvious problem state.
  return { bg: '#fef2f2', fg: '#dc2626', label: `${t('trackPaused')} — ${status ? t(`st_${status}`) : '?'}` };
}

function sessionBadge(status: Session['status']) {
  return status === 'ACTIVE' ? { bg: '#ecfdf5', fg: '#16a34a' } : { bg: '#f1f5f9', fg: '#64748b' };
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const { t } = useT();
  const [consent, setConsent] = useState(false);
  const [gps, setGps] = useState<{ status: 'idle' | 'busy' | 'ok' | 'fail'; text?: string }>({ status: 'idle' });
  // The fix from step 1, reused at punch-in so we don't wait for a second GPS search.
  const [gpsPoint, setGpsPoint] = useState<{ latitude: number; longitude: number; accuracy: number | null; at: number } | null>(null);
  const firstLoad = useRef(true);
  const [asset, setAsset] = useState<SelfieAsset | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteMsg, setNoteMsg] = useState('');

  const loadCurrent = useCallback(async () => {
    if (firstLoad.current) setLoading(true); // only the first load blocks the screen; later focuses refresh quietly
    try {
      const [curRes, historyRes] = await Promise.all([
        api.get('/attendance/current/'),
        api.get('/attendance/history/').catch(() => null),
      ]);
      setSession(curRes.data.session ?? null);
      if (historyRes) {
        const list = unwrapList<Session>(historyRes.data);
        list.sort((a, b) => new Date(b.punch_in_at).getTime() - new Date(a.punch_in_at).getTime());
        setRecentSessions(list.slice(0, 3));
      }
      if (curRes.data.session?.status === 'ACTIVE') beginTracking();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      firstLoad.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrent();
    }, [loadCurrent]),
  );

  // Switch the camera off when leaving this tab.
  useFocusEffect(useCallback(() => () => setCameraOpen(false), []));

  useEffect(() => {
    if (session?.status !== 'ACTIVE') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session?.status]);

  // One tap: agreeing to the notice and getting the GPS fix are the same action.
  const acquireGps = async () => {
    setConsent(true);
    setGps({ status: 'busy' });
    try {
      const perm = await requestTrackingPermissions();
      if (!perm.granted && perm.reason?.startsWith('Location permission denied')) throw new Error(perm.reason);
      const p = await getCurrentPoint();
      setGpsPoint({ ...p, at: Date.now() });
      setGps({ status: 'ok', text: `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}${p.accuracy != null ? ` (±${Math.round(p.accuracy)}m)` : ''}` });
    } catch (e) {
      setGps({ status: 'fail', text: e instanceof Error ? e.message : 'Could not get a GPS fix' });
    }
  };

  const punchIn = async () => {
    if (!asset) return;
    setError('');
    setBusy(true);
    try {
      const point = gpsPoint && Date.now() - gpsPoint.at < 120000 ? gpsPoint : await getCurrentPoint();
      const form = new FormData();
      form.append('selfie', {
        uri: asset.uri,
        name: 'selfie.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);
      form.append('latitude', String(point.latitude));
      form.append('longitude', String(point.longitude));
      if (point.accuracy != null) form.append('accuracy', String(point.accuracy));

      const r = await api.post('/attendance/punch-in/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSession(r.data);
      setAsset(null);
      setConsent(false);
      setGps({ status: 'idle' });
      setGpsPoint(null);
      beginTracking();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    try {
      await api.post('/attendance/notes/', { content: note.trim() });
      setNote('');
      setNoteMsg('Saved.');
    } catch (err) {
      setNoteMsg(errorMessage(err));
    }
  };

  const punchOut = async () => {
    setError('');
    setBusy(true);
    try {
      const point = await getQuickPoint(); // the final location is optional, so never wait long for it
      const r = await api.post('/attendance/punch-out/', point ?? {});
      setSession(r.data);
      stopTracking().catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => setOnDuty(session?.status === 'ACTIVE'), [session?.status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00c696" />
      </View>
    );
  }

  const isActive = session?.status === 'ACTIVE';
  const duration = isActive ? (session?.duration_seconds ?? 0) + tick : session?.duration_seconds ?? 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadCurrent} />}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isActive ? (
        <>
          <View style={[styles.statusCard, styles.statusActive]}>
            <Text style={styles.statusLabel}>{t('onDuty').toUpperCase()}</Text>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            {(() => {
              const tb = trackingBadge(session?.tracking_status, t);
              return (
                <View style={[styles.trackingBadge, { backgroundColor: tb.bg }]}>
                  <Text style={[styles.trackingBadgeText, { color: tb.fg }]}>{tb.label}</Text>
                </View>
              );
            })()}
            <Text style={styles.statusSub}>
              Since {session?.punch_in_at ? new Date(session.punch_in_at).toLocaleTimeString() : '—'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.actionButton, styles.punchOutButton]} onPress={punchOut} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>{t('punchOutBtn')}</Text>}
          </TouchableOpacity>
          <Text style={styles.hint}>{t('keepTracking')}</Text>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('punchInTitle')}</Text>
          <Text style={styles.stepSub}>{t('punchInSub')}</Text>

          <View style={styles.step}>
            <View style={styles.stepHead}>
              <Text style={styles.stepTitle}>1  {t('stepLocation')}</Text>
              {gps.status === 'ok' ? (
                <TouchableOpacity onPress={acquireGps}>
                  <Text style={styles.link}>{t('refresh')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.consentText}>{t('consentText')}</Text>
            {gps.status !== 'ok' ? (
              <TouchableOpacity
                style={[styles.pickBtn, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}
                onPress={acquireGps}
                disabled={gps.status === 'busy'}
              >
                <Text style={[styles.pickText, { color: '#047857' }]}>{gps.status === 'busy' ? t('locating') : t('agreeGps')}</Text>
              </TouchableOpacity>
            ) : null}
            {gps.text ? <Text style={[styles.gpsText, gps.status === 'fail' && { color: '#dc2626' }]}>{gps.text}</Text> : null}
          </View>

          <View style={styles.step}>
            <Text style={styles.stepTitle}>2  {t('stepSelfie')}</Text>
            {asset ? (
              <View style={styles.selfieRow}>
                <Image source={{ uri: asset.uri }} style={styles.selfieThumb} />
                <TouchableOpacity onPress={() => setAsset(null)}>
                  <Text style={[styles.link, { color: '#e11d48' }]}>{t('retake')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              cameraOpen ? (
                <SelfieCamera onCapture={(a) => { setAsset(a); setCameraOpen(false); }} onCancel={() => setCameraOpen(false)} />
              ) : (
                <TouchableOpacity style={styles.cameraStart} onPress={() => { setError(''); setCameraOpen(true); }} accessibilityRole="button">
                  <View style={styles.guideOval} />
                  <Text style={styles.cameraStartText}>{t('tapToOpenCamera')}</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          <View style={styles.req}>
            <Text style={styles.reqTitle}>{t('requirements').toUpperCase()}</Text>
            {([[consent, t('reqConsent')], [gps.status === 'ok', t('reqGps')], [!!asset, t('reqSelfie')]] as [boolean, string][]).map(([ok, label]) => (
              <Text key={label} style={[styles.reqItem, ok && { color: '#059669', fontWeight: '700' }]}>{ok ? '●' : '○'}  {label}</Text>
            ))}
          </View>

          {(() => {
            const ready = consent && gps.status === 'ok' && !!asset && !busy;
            return (
              <TouchableOpacity style={[styles.actionButton, ready ? styles.punchInButton : styles.disabledButton]} onPress={punchIn} disabled={!ready}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.actionButtonText, !ready && { color: '#94a3b8' }]}>{t('punchInBtn')}</Text>}
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('fieldNotes')}</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder="Record notes about today's client meetings, field visits, or tasks…"
          placeholderTextColor="#94a3b8"
          value={note}
          onChangeText={(v) => { setNote(v); setNoteMsg(''); }}
        />
        <View style={styles.stepHead}>
          <Text style={styles.stepSub}>{noteMsg}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={saveNote}>
            <Text style={styles.saveText}>{t('saveNotes')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.stepHead}>
          <Text style={styles.cardTitle}>{t('recentShifts').toUpperCase()}</Text>
          <TouchableOpacity onPress={() => router.navigate('/history')}>
            <Text style={styles.link}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>
        {recentSessions.length === 0 ? (
          <Text style={[styles.stepSub, { textAlign: 'center', paddingVertical: 12 }]}>{t('noRecent')}</Text>
        ) : (
          recentSessions.map((x, i) => {
            const b = sessionBadge(x.status);
            return (
              <View key={x.id} style={[styles.recentRow, i === recentSessions.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.shiftLabel}>{new Date(x.punch_in_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                <Text style={styles.shiftValue}>{formatShortDuration(x.duration_seconds)}</Text>
                <View style={[styles.recentBadge, { backgroundColor: b.bg }]}>
                  <Text style={[styles.recentBadgeText, { color: b.fg }]}>{x.status}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 20, paddingTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subGreeting: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statusActive: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#34d399' },
  statusInactive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statusLabel: { fontSize: 12, fontWeight: '700', color: '#00c696', marginBottom: 8, letterSpacing: 1 },
  durationText: { fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  statusSub: { fontSize: 13, color: '#475569' },
  statusSubCentered: { textAlign: 'center' },
  selfiePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  selfieLensOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieLensInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#94a3b8' },
  error: { color: '#dc2626', backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13 },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  punchInButton: { backgroundColor: '#00c696' },
  punchOutButton: { backgroundColor: '#dc2626' },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  shiftLabel: { fontSize: 13, color: '#64748b' },
  shiftValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  trackingBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  trackingBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recentBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  recentBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  disabledButton: { backgroundColor: '#e2e8f0' },
  stepSub: { fontSize: 11, color: '#64748b' },
  step: { backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, marginTop: 12, gap: 8 },
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  link: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  consentText: { flex: 1, fontSize: 12, color: '#475569' },
  gpsText: { fontSize: 12, color: '#047857' },
  selfieRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  selfieThumb: { width: 64, height: 64, borderRadius: 12 },
  cameraStart: { width: '100%', aspectRatio: 1.4, borderRadius: 18, borderWidth: 2, borderColor: '#a7f3d0', borderStyle: 'dashed', backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', gap: 10 },
  guideOval: { width: 70, height: 88, borderRadius: 999, borderWidth: 2, borderColor: '#10b981' },
  cameraStartText: { fontSize: 13, fontWeight: '800', color: '#047857' },
  pickRow: { flexDirection: 'row', gap: 8 },
  pickBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  pickText: { fontSize: 12, fontWeight: '700', color: '#475569', textAlign: 'center' },
  req: { borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 14, padding: 14, marginTop: 12, gap: 6 },
  reqTitle: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.8 },
  reqItem: { fontSize: 12, color: '#94a3b8' },
  tiles: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tileBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 10, alignItems: 'center' },
  tileVal: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  noteInput: { minHeight: 90, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginVertical: 10, textAlignVertical: 'top', color: '#0f172a' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
