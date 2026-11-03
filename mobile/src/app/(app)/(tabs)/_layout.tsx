import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import AppHeader from '../../../components/AppHeader';
import { useT } from '../../../i18n';

const TABS: { name: string; key: string; icon: string }[] = [
  { name: 'index', key: 'attendance', icon: '🖐' },
  { name: 'history', key: 'history', icon: '🕒' },
  { name: 'profile', key: 'profile', icon: '👤' },
];

// Only the three bottom tabs live here. Every other screen (Password, Language, ...) is a Stack screen
// in ../_layout.tsx: a tab hidden with `href: null` redirects to the first tab instead of opening.
export default function AppTabsLayout() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: '#00c696',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.key),
            tabBarIcon: ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{tab.icon}</Text>,
          }}
        />
      ))}
    </Tabs>
  );
}
