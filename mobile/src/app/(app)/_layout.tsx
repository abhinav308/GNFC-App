import { Stack } from 'expo-router';
import AppHeader from '../../components/AppHeader';

// (tabs) is the bottom tab bar (Attendance, History, Profile) and draws its own header.
// Every other screen in this folder (Password, Language, ...) opens on top of it, with the same header.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ header: () => <AppHeader /> }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
