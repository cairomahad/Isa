import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, View, StyleSheet } from 'react-native';
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
          overflow: 'visible',
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

      {/* УММА — центральная большая кнопка */}
      <Tabs.Screen
        name="umma"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={[ummaStyles.centerIcon, focused && ummaStyles.centerIconFocused, { backgroundColor: Colors.primary }]}>
              <Ionicons name="people" size={26} color="#FFFFFF" />
            </View>
          ),
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={[ummaStyles.centerButton]}
              activeOpacity={0.85}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="zikr"
        options={{ title: 'Зикр', tabBarIcon: ({ color }) => <TabIcon name="radio-button-on" color={color} /> }}
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
      <Tabs.Screen name="rating" options={{ href: null }} />
    </Tabs>
  );
}

const ummaStyles = StyleSheet.create({
  centerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    top: -18,
  },
  centerIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C4963A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
  centerIconFocused: {
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
});
