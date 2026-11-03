import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Lang, setLang, useT } from '../i18n';
import { errorMessage } from '../services/api';

const NAVY = '#0a192f';
const GREEN = '#00c696';
const LANGS: [Lang, string][] = [['en', 'English'], ['hi', 'हिंदी'], ['gu', 'ગુજરાતી']];

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, lang } = useT();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // While a box is focused the keyboard is open: hide the big title so the form fits above the keyboard.
  const [typing, setTyping] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onFocus = () => {
    clearTimeout(blurTimer.current);
    setTyping(true);
  };
  const onBlur = () => {
    blurTimer.current = setTimeout(() => setTyping(false), 200); // moving between the two boxes should not flicker
  };

  // The account's own role decides which part of the app opens (the root layout routes by role).
  const signIn = async (id: string, pass: string) => {
    setBusy(true);
    setError('');
    try {
      await login(id, pass);
    } catch (err) {
      setError(errorMessage(err) || 'Authentication failed. Please verify your credentials.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (identifier.trim() && password) signIn(identifier.trim(), password);
  };

  return (
    <View style={s.screen}>
      <View style={s.glow} pointerEvents="none" />
      <View style={s.ring} pointerEvents="none" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.hero, typing && s.heroTyping]}>
            <View style={s.topRow}>
              <View style={s.brand}>
                <View style={s.mark}>
                  <Text style={s.markText}>n</Text>
                </View>
                <Text style={s.brandText}>Code Solutions</Text>
              </View>
              <View style={s.langs}>
                {LANGS.map(([code, label]) => (
                  <TouchableOpacity key={code} style={[s.lang, lang === code && s.langOn]} onPress={() => setLang(code)} accessibilityRole="button">
                    <Text style={[s.langText, lang === code && { color: NAVY }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {typing ? null : (
              <>
                <Text style={s.title}>Field Force</Text>
                <View style={s.route} accessibilityElementsHidden>
                  <View style={s.dot} />
                  <View style={s.line} />
                  <View style={s.dot} />
                  <View style={s.line} />
                  <Text style={s.pin}>📍</Text>
                </View>
                <Text style={s.lead}>{t('loginLead')}</Text>
              </>
            )}
          </View>

          <View style={[s.sheet, typing && s.sheetTyping]}>
            <Text style={s.sheetTitle}>{t('loginTitle')}</Text>
            <Text style={s.sheetSub}>{t('loginSub')}</Text>

            <View style={s.field}>
              <Text style={s.fieldIcon}>👤</Text>
              <TextInput
                style={s.input}
                placeholder={t('phId')}
                accessibilityLabel={t('loginFieldId')}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={setIdentifier}
                returnKeyType="next"
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldIcon}>🔒</Text>
              <TextInput
                style={s.input}
                placeholder={t('phPw')}
                accessibilityLabel={t('loginFieldPw')}
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                returnKeyType="go"
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} accessibilityRole="button">
                <Text style={s.show}>{showPassword ? t('hide') : t('show')}</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={[s.button, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color={NAVY} /> : <Text style={s.buttonText}>{t('loginBtn')}</Text>}
            </TouchableOpacity>

            {/* Demo shortcuts: development only, hidden in release builds */}
            {__DEV__ && (
              <View style={s.devWrap}>
                <Text style={s.devLabel}>Dev shortcuts</Text>
                <View style={s.devRow}>
                  {(
                    [
                      ['Admin', 'admin@honey.com', '123456'],
                      ['Staff', 'staff@honey.com', '123456'],
                      ['Manager', 'manager@honey.com', '123456'],
                    ] as const
                  ).map(([label, id, pass]) => (
                    <TouchableOpacity key={id} style={s.devBtn} onPress={() => signIn(id, pass)} disabled={busy}>
                      <Text style={s.devText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY, overflow: 'hidden' },
  // Soft shapes behind the hero. They carry no information.
  glow: { position: 'absolute', top: -150, right: -130, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(0,198,150,0.13)' },
  ring: { position: 'absolute', top: 120, left: -150, width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  scroll: { flexGrow: 1 },
  hero: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 28, gap: 14 },
  heroTyping: { paddingTop: 40, paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 32, height: 32, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  markText: { color: NAVY, fontWeight: '900', fontSize: 18, marginTop: -2 },
  brandText: { color: '#e2e8f0', fontWeight: '700', fontSize: 14, letterSpacing: 0.4 },
  langs: { flexDirection: 'row', gap: 6 },
  lang: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  langOn: { backgroundColor: GREEN, borderColor: GREEN },
  langText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  title: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1, marginTop: 28 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  line: { width: 34, height: 2, borderRadius: 1, backgroundColor: 'rgba(0,198,150,0.45)' },
  pin: { fontSize: 20 },
  lead: { color: '#94a3b8', fontSize: 14, lineHeight: 20, maxWidth: 320 },
  // marginTop auto keeps the sheet at the bottom while the title is shown; while typing it sits right under the logo, only as tall as its content.
  sheet: { marginTop: 'auto', backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32, gap: 14 },
  sheetTyping: { marginTop: 0, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  sheetTitle: { fontSize: 24, fontWeight: '800', color: NAVY },
  sheetSub: { fontSize: 14, color: '#64748b', marginTop: -8 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14 },
  fieldIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 15, color: NAVY },
  show: { color: '#0f766e', fontWeight: '700', fontSize: 13, paddingLeft: 8 },
  error: { color: '#b91c1c', backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  button: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: NAVY, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  devWrap: { marginTop: 6, gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  devLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  devRow: { flexDirection: 'row', gap: 8 },
  devBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  devText: { color: '#475569', fontWeight: '700', fontSize: 12 },
});
