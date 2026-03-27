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
          title: 'Главная',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          tabBarTestID: 'tab-home',
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
        name="zikr"
        options={{
          title: 'Зикр',
          tabBarIcon: ({ color }) => <TabIcon name="bead-outline" color={color} />,
          tabBarTestID: 'tab-zikr',
        }}
      />
      <Tabs.Screen
        name="qa"
        options={{
          title: 'Вопросы',
          tabBarIcon: ({ color }) => <TabIcon name="chatbubbles" color={color} />,
          tabBarTestID: 'tab-qa',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ещё',
          tabBarIcon: ({ color }) => <TabIcon name="menu" color={color} />,
          tabBarTestID: 'tab-settings',
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen
        name="hadiths"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="rating"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="missed-prayers"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
