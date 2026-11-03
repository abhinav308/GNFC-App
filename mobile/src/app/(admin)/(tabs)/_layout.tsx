import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { can } from '../../../services/permissions';

const TABS = [
  { name: 'overview', title: 'Command', icon: '📊', screen: 'dashboard' },
  { name: 'map', title: 'Live Map', icon: '🗺️', screen: 'dashboard' },
  { name: 'attendance', title: 'Attendance', icon: '🕒', screen: 'attendance.sessions' },
  { name: 'users', title: 'Users', icon: '👥', screen: 'user_management.user' },
  { name: 'more', title: 'More', icon: '☰', screen: undefined },
];

// Open on Command (home); without this the first tab in file order (Live Map) opens.
export const unstable_settings = { initialRouteName: 'overview' };

export default function AdminTabsLayout() {
  const { user } = useAuth();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0088ff', tabBarInactiveTintColor: '#94a3b8' }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{t.icon}</Text>,
            // Only for roles without access: this tab is never a navigation target, so it is safe to hide.
            href: !t.screen || can(user, t.screen) ? undefined : null,
          }}
        />
      ))}
    </Tabs>
  );
}
