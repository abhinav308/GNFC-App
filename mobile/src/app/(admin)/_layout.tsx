import { Stack } from 'expo-router';

// (tabs) is the bottom tab bar. Every other admin screen (Leaves, Setup, Visit details, ...) opens on top of it
// as a Stack screen: a tab hidden with `href: null` redirects to the first tab instead of opening.
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
