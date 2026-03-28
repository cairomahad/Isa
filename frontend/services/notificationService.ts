import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
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
        type: SchedulableTriggerInputTypes.CALENDAR,
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
        type: SchedulableTriggerInputTypes.CALENDAR,
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
 * Тестовое уведомление (через 5 секунд)
 */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tazakkur',
      body: 'Тестовое уведомление работает!',
      sound: 'default',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}
