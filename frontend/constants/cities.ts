export type City = {
  label: string;
  city: string;
  country: string;
  method: number;
  slug: string; // для Backend API
};

export const CITIES: City[] = [
  { label: 'Москва', city: 'Moscow', country: 'Russia', method: 3, slug: 'moscow' },
  { label: 'Казань', city: 'Kazan', country: 'Russia', method: 3, slug: 'kazan' },
  { label: 'Грозный', city: 'Grozny', country: 'Russia', method: 3, slug: 'grozny' },
  { label: 'Санкт-Петербург', city: 'Saint Petersburg', country: 'Russia', method: 3, slug: 'moscow' },
  { label: 'Уфа', city: 'Ufa', country: 'Russia', method: 3, slug: 'moscow' },
  { label: 'Махачкала', city: 'Makhachkala', country: 'Russia', method: 3, slug: 'moscow' },
  { label: 'Каир', city: 'Cairo', country: 'Egypt', method: 5, slug: 'cairo' },
  { label: 'Стамбул', city: 'Istanbul', country: 'Turkey', method: 13, slug: 'istanbul' },
  { label: 'Дубай', city: 'Dubai', country: 'UAE', method: 16, slug: 'mecca' },
  { label: 'Ташкент', city: 'Tashkent', country: 'Uzbekistan', method: 3, slug: 'moscow' },
  { label: 'Алматы', city: 'Almaty', country: 'Kazakhstan', method: 3, slug: 'moscow' },
  { label: 'Баку', city: 'Baku', country: 'Azerbaijan', method: 3, slug: 'moscow' },
];

export const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Фаджр',
  Sunrise: 'Восход',
  Dhuhr: 'Зухр',
  Asr: 'Аср',
  Maghrib: 'Магриб',
  Isha: 'Иша',
};
