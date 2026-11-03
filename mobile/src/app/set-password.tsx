import { ScrollView, StyleSheet, Text } from 'react-native';
import ChangePasswordForm from '../components/ChangePasswordForm';

// Shown instead of the app while the account still has the temporary password that was emailed.
export default function SetPassword() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Choose your password</Text>
      <Text style={s.sub}>You signed in with a temporary password. Enter it below as the current password, then choose a permanent one. You will sign in again afterwards.</Text>
      <ChangePasswordForm />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingTop: 72, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 12 },
});
