import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../contexts/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8);
  const tabHeight = (Platform.OS === 'ios' ? 60 : 58) + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopWidth: 0.5,
          borderTopColor: Colors.border,
          paddingBottom: bottomPad,
          paddingTop: 10,
          height: tabHeight,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Главная', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="lessons"
        options={{ title: 'Уроки', tabBarIcon: ({ color }) => <TabIcon name="book" color={color} /> }}
      />
      <Tabs.Screen
        name="zikr"
        options={{ title: 'Зикр', tabBarIcon: ({ color }) => <TabIcon name="radio-button-on" color={color} /> }}
      />
      <Tabs.Screen
        name="rating"
        options={{ title: 'Рейтинг', tabBarIcon: ({ color }) => <TabIcon name="trophy" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ещё', tabBarIcon: ({ color }) => <TabIcon name="menu" color={color} /> }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen name="prayers" options={{ href: null }} />
      <Tabs.Screen name="quran" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="hadiths" options={{ href: null }} />
      <Tabs.Screen name="qa" options={{ href: null }} />
      <Tabs.Screen name="missed-prayers" options={{ href: null }} />
    </Tabs>
  );
}
