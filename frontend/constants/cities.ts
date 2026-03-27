export type City = {
  label: string;
  city: string;
  country: string;
  method: number;
};

export const CITIES: City[] = [
  { label: 'Москва', city: 'Moscow', country: 'Russia', method: 3 },
  { label: 'Казань', city: 'Kazan', country: 'Russia', method: 3 },
  { label: 'Грозный', city: 'Grozny', country: 'Russia', method: 3 },
  { label: 'Санкт-Петербург', city: 'Saint Petersburg', country: 'Russia', method: 3 },
  { label: 'Уфа', city: 'Ufa', country: 'Russia', method: 3 },
  { label: 'Махачкала', city: 'Makhachkala', country: 'Russia', method: 3 },
  { label: 'Каир', city: 'Cairo', country: 'Egypt', method: 5 },
  { label: 'Стамбул', city: 'Istanbul', country: 'Turkey', method: 13 },
  { label: 'Дубай', city: 'Dubai', country: 'UAE', method: 16 },
  { label: 'Ташкент', city: 'Tashkent', country: 'Uzbekistan', method: 3 },
  { label: 'Алматы', city: 'Almaty', country: 'Kazakhstan', method: 3 },
  { label: 'Баку', city: 'Baku', country: 'Azerbaijan', method: 3 },
];

export const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Фаджр',
  Sunrise: 'Восход',
  Dhuhr: 'Зухр',
  Asr: 'Аср',
  Maghrib: 'Магриб',
  Isha: 'Иша',
};
