/**
 * _layout.tsx — используем кастомный UmmaTabBar (аналог TabBar.js из донора)
 * SVG-кривая + анимированные иконки + центральная кнопка с градиентом
 */
import { Tabs } from 'expo-router';
import UmmaTabBar from '../../components/umma/UmmaTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <UmmaTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Главная' }} />
      <Tabs.Screen name="lessons"  options={{ title: 'Уроки' }} />
      <Tabs.Screen name="umma"     options={{ title: 'Умма' }} />
      <Tabs.Screen name="zikr"     options={{ title: 'Зикр' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ещё' }} />

      {/* Скрытые вкладки */}
      <Tabs.Screen name="prayers"       options={{ href: null }} />
      <Tabs.Screen name="quran"         options={{ href: null }} />
      <Tabs.Screen name="profile"       options={{ href: null }} />
      <Tabs.Screen name="hadiths"       options={{ href: null }} />
      <Tabs.Screen name="qa"            options={{ href: null }} />
      <Tabs.Screen name="missed-prayers" options={{ href: null }} />
      <Tabs.Screen name="rating"        options={{ href: null }} />
    </Tabs>
  );
}
