import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Настройка уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Фаджр',
  Dhuhr: 'Зухр',
  Asr: 'Аср',
  Maghrib: 'Магриб',
  Isha: 'Иша',
};

/**
 * Запрос разрешения на уведомления
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Android канал
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: 'Времена намаза',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C4963A',
      sound: 'default',
    });
  }

  return true;
}

/**
 * Отмена всех запланированных уведомлений о намазе
 */
export async function cancelAllPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduled) {
    if (notification.identifier.startsWith('prayer-')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
  
  await AsyncStorage.removeItem('prayer_notifications_scheduled');
}

/**
 * Планирование уведомлений для всех намазов
 */
export async function schedulePrayerNotifications(prayerTimes: PrayerTimes): Promise<void> {
  // Сначала отменяем старые
  await cancelAllPrayerNotifications();

  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

  for (const prayer of prayers) {
    const time = prayerTimes[prayer];
    if (!time) continue;

    const [hours, minutes] = time.split(':').map(Number);

    // Вычисляем время за 5 минут до намаза
    const totalReminderMinutes = hours * 60 + minutes - 5;
    const reminderHour = Math.floor(((totalReminderMinutes % 1440) + 1440) % 1440 / 60);
    const reminderMinute = ((totalReminderMinutes % 60) + 60) % 60;

    // Основное уведомление (за 5 минут до времени намаза)
    await Notifications.scheduleNotificationAsync({
      identifier: `prayer-${prayer.toLowerCase()}-reminder`,
      content: {
        title: `Скоро ${PRAYER_NAMES[prayer]}`,
        body: `Через 5 минут начнётся время ${PRAYER_NAMES[prayer]} (${time})`,
        sound: 'default',
        data: { type: 'prayer-reminder', prayer },
      },
      trigger: {
        repeats: true,
        hour: reminderHour,
        minute: reminderMinute,
        channelId: 'prayer-times',
      },
    });

    // Уведомление в точное время намаза
    await Notifications.scheduleNotificationAsync({
      identifier: `prayer-${prayer.toLowerCase()}`,
      content: {
        title: `${PRAYER_NAMES[prayer]}`,
        body: `Наступило время ${PRAYER_NAMES[prayer]}. Совершите намаз!`,
        sound: 'default',
        data: { type: 'prayer-time', prayer },
      },
      trigger: {
        repeats: true,
        hour: hours,
        minute: minutes,
        channelId: 'prayer-times',
      },
    });
  }

  // Сохраняем флаг что уведомления запланированы
  await AsyncStorage.setItem('prayer_notifications_scheduled', 'true');
  await AsyncStorage.setItem('prayer_notifications_times', JSON.stringify(prayerTimes));
}

/**
 * Проверка включены ли уведомления
 */
export async function arePrayerNotificationsEnabled(): Promise<boolean> {
  const scheduled = await AsyncStorage.getItem('prayer_notifications_scheduled');
  return scheduled === 'true';
}

/**
 * Получение запланированных уведомлений для отладки
 */
export async function getScheduledPrayerNotifications() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter(n => n.identifier.startsWith('prayer-'));
}

/**
 * Планирование ежедневных уведомлений для программы Хифза
 */
export async function scheduleQuranNotifications(
  eveningHour: number,
  morningHour: number
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: ns } = await Notifications.requestPermissionsAsync();
      if (ns !== 'granted') return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('quran', {
        name: 'Хифз Корана',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C4963A',
        sound: 'default',
      });
    }

    // Cancel old quran notifications
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier.startsWith('quran-')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // Schedule evening lesson reminder
    const eveningTrigger: any = { hour: eveningHour, minute: 0, repeats: true };
    if (Platform.OS === 'android') eveningTrigger.channelId = 'quran';

    await Notifications.scheduleNotificationAsync({
      identifier: 'quran-evening',
      content: {
        title: '🌙 Время вечернего урока Корана',
        body: 'Продолжите изучение Корана. Новые аяты ждут вас!',
        sound: 'default',
        data: { type: 'quran-evening' },
      },
      trigger: eveningTrigger,
    });

    // Schedule morning review reminder
    const morningTrigger: any = { hour: morningHour, minute: 0, repeats: true };
    if (Platform.OS === 'android') morningTrigger.channelId = 'quran';

    await Notifications.scheduleNotificationAsync({
      identifier: 'quran-morning',
      content: {
        title: '☀️ Время утреннего повторения',
        body: 'Повторите выученные аяты, пока они свежи в памяти.',
        sound: 'default',
        data: { type: 'quran-morning' },
      },
      trigger: morningTrigger,
    });

    await AsyncStorage.setItem('quran_notifications_set', JSON.stringify({ eveningHour, morningHour }));
  } catch (e) {
    console.warn('Failed to schedule quran notifications:', e);
  }
}

/**
 * Отмена уведомлений программы Хифза
 */
export async function cancelQuranNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith('quran-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  await AsyncStorage.removeItem('quran_notifications_set');
}

/**
 * Планирование уведомления о разблокировке урока
 */
export async function scheduleLessonUnlockNotification(
  lessonTitle: string,
  courseLabel: string,
  unlockDate?: Date
): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('lessons', {
        name: 'Новые уроки',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C4963A',
        sound: 'default',
      });
    }

    const triggerDate = unlockDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const id = `lesson-unlock-${Date.now()}`;

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: 'Новый урок доступен!',
        body: `${courseLabel}: следующий урок открылся. Продолжайте обучение!`,
        sound: 'default',
        data: { type: 'lesson-unlock' },
      },
      trigger: { date: triggerDate },
    });

    console.log(`Lesson unlock notification scheduled for ${triggerDate.toISOString()}`);
    return id;
  } catch (e) {
    console.warn('Failed to schedule lesson unlock notification:', e);
    return null;
  }
}

/**
 * Отмена уведомлений о разблокировке уроков
 */
export async function cancelLessonNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.identifier.startsWith('lesson-unlock-')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}


/**
 * Тестовое уведомление для проверки работы системы
 */
export async function sendTestNotification(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `test-${Date.now()}`,
    content: {
      title: 'Тест уведомлений',
      body: 'Уведомления работают корректно!',
      sound: 'default',
    },
    trigger: { seconds: 1 },
  });
}
