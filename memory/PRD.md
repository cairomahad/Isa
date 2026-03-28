# Tazakkur — React Native / Expo APK Build Fix

## Дата: 2026-03-28

## Исходная задача
Исправить проект Expo (SDK 54) на MacBook для успешной сборки APK через:
`eas build --platform android --profile preview`

- EAS аккаунт: ben777 (iaba30294@gmail.com)
- EAS Project ID: b0a306ed-8647-4ec0-a973-99cb3bba0466
- Бэкенд: http://192.168.1.8:8001 (MacBook в локальной WiFi)
- Supabase: https://kmhhazpyalpjwspjxzry.supabase.co

## Архитектура
- React Native / Expo SDK 54
- expo-router (файловая маршрутизация)
- Supabase (auth + база данных)
- FastAPI бэкенд на порту 8001
- EAS Build (cloud build service)

## Исправленные проблемы

### 1. package.json — неверные версии зависимостей
- `expo-notifications`: canary 55 → `~0.28.0` (для expo 54)
- `expo-image-picker`: `^55.0.14` → `~15.0.7` (для expo 54)
- `react-native-worklets`: `0.5.1` → `0.8.1` (для react-native-reanimated 4.x)
- Удалён `package-lock.json`, обновлён `yarn.lock`

### 2. eas.json
- `buildType: "aab"` → `"app-bundle"` (валидное значение)
- Добавлен `NPM_CONFIG_LEGACY_PEER_DEPS: "true"` для preview и production
- Добавлен `EXPO_PUBLIC_BACKEND_URL: "http://192.168.1.8:8001"` в env preview

### 3. app.json
- `projectId: "tazakkur-islamic-app"` → `"b0a306ed-8647-4ec0-a973-99cb3bba0466"` (реальный UUID из EAS)
- Удалён `versionCode: 1` (конфликт с `appVersionSource: "remote"`)

### 4. @env импорты — главная причина "Bundle JavaScript" ошибки
6 файлов использовали `import { REACT_APP_BACKEND_URL } from '@env'` без babel плагина:
- `app/admin/content.tsx`
- `app/admin/index.tsx`
- `app/search.tsx`
- `app/(tabs)/zikr.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/rating.tsx`

Заменено на: `const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001'`

### 5. services/notificationService.ts — неверный trigger API
- `{ date: Date, repeats: true }` → `SchedulableTriggerInputTypes.CALENDAR`
- `{ seconds: 5 }` → `SchedulableTriggerInputTypes.TIME_INTERVAL`

### 6. .gitignore
- Добавлен `package-lock.json` в исключения

## Что нужно сделать на MacBook

```bash
# В папке frontend:
git pull                                      # Получить исправления
rm -f package-lock.json                       # Удалить старый lock
yarn install                                  # Установить зависимости
git add yarn.lock
git commit -m "fix: all build issues resolved"
eas build --platform android --profile preview
```

## Статус
- [ ] Все исправления применены в коде
- [ ] yarn.lock обновлён
- [ ] Пользователь должен запустить сборку на MacBook

## Backlog
- Настроить CI/CD pipeline через GitHub Actions
- Добавить production бэкенд URL (не локальный IP)
