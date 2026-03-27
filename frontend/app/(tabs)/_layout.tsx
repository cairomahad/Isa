import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Platform } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: Colors.darkGreen,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 62,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.mediumGreen,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Уроки',
          tabBarIcon: ({ color }) => <TabIcon name="book" color={color} />,
          tabBarTestID: 'tab-lessons',
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: 'Намазы',
          tabBarIcon: ({ color }) => <TabIcon name="moon" color={color} />,
          tabBarTestID: 'tab-prayers',
        }}
      />
      <Tabs.Screen
        name="hadiths"
        options={{
          title: 'Хадисы',
          tabBarIcon: ({ color }) => <TabIcon name="library" color={color} />,
          tabBarTestID: 'tab-hadiths',
        }}
      />
      <Tabs.Screen
        name="rating"
        options={{
          title: 'Рейтинг',
          tabBarIcon: ({ color }) => <TabIcon name="trophy" color={color} />,
          tabBarTestID: 'tab-rating',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
          tabBarTestID: 'tab-settings',
        }}
      />
    </Tabs>
  );
}
