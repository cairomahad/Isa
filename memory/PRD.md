# PRD — Tazakkur (Исламское приложение)

## Описание
React Native (Expo) + FastAPI + Supabase приложение для мусульман.
Функции: времена намаза, хифз Корана, зикр, уроки, Умма (соцсеть), Q&A шейху.

## Архитектура
- Frontend: React Native / Expo (expo-router), TypeScript
- Backend: FastAPI (Python), Supabase (PostgreSQL)
- Деплой backend: Railway (https://tazakkur-production-c8c9.up.railway.app)
- Сборка APK: EAS Build (expo.dev), профиль `preview`

## Тестовые аккаунты
- admin@test.com / admin123 (role=admin)
- student@test.com / student123 (role=student)

## Что реализовано (по сессиям)

### Сессия 1 — TypeScript ошибки (коммит 1a3e762)
- notificationService.ts: убран SchedulableTriggerInputTypes, исправлены триггеры, добавлен sendTestNotification
- NewPostModal.tsx: добавлен TouchableOpacity
- PostCard.tsx: useMemo(styles) в FooterButton и Avatar
- hadiths.tsx: иконка scroll → book-outline
- admin/review.tsx: добавлены поля created_at, question в тип
- homework/[id].tsx: тип Audio.Recording → any
- profile.tsx: cast as any для роута /achievements

### Сессия 2 — Баги + UI (коммит 3a194b4 → 24dfcf4)
**UI:**
- UmmaTabBar: плоский дизайн (нет SVG кривой), все кнопки на одном уровне
- index.tsx: paddingBottom 110, кнопка Уроки в быстрых действиях
- index.tsx: плашка "Хадис дня" авторастягивается (нет maxHeight, нет ScrollView)
- umma.tsx: FAB кнопка bottom: 110

**Баги:**
1. profile.tsx: кнопка "Панель администратора" для role=admin
2. Q&A шейху: полная реализация — submit/my-questions/public API, реальный UI
3. Хифз: убран telegram_id из INSERT в quran_program, поиск по user_id
4. admin _check_can_post: admin всегда может делать посты
5. Авторизация: email+пароль (логин/регистрация), тестовые аккаунты в БД
6. Басмала: не дублируется в хифзе
7. admin/answer-question: 422 fix (Pydantic body)
8. umma post create: .select() → .execute()
9. /quran/program: user_id вместо telegram_id

**Кэш (services/cache.ts):**
- Хадис дня: 24ч | Молитвы: 12ч | Публичные Q&A: 10мин | Хадисы: 30мин
- Pull-to-refresh сбрасывает кэш
- Кнопка "Сбросить кэш" в админке
- /api/home/data: один запрос вместо 3 на главном экране

**Сплэш-экран:**
- splash-logo-transparent.png (лого без фона)
- Фон #1A1A2E (тёмная тема приложения)

**Очистка репо:**
- Удалены 18 файлов: md-документация, sql-архивы, скрипты

## P0 — Критичные задачи

- [ ] SQL в Supabase: `ALTER TABLE quran_program ALTER COLUMN telegram_id DROP NOT NULL;`
  (нужно выполнить чтобы хифз полностью работал для email-пользователей)
- [ ] Проверить работу лайков в Умме (is_liked в /api/umma/feed)

## P1 — Следующие задачи

- [ ] Email верификация (Supabase Auth + подтверждение по email)
- [ ] Сплэш-экран: после сборки APK проверить отображение
- [ ] Протестировать весь флоу регистрации/входа

## P2 — Бэклог

- [ ] Push-уведомления для ответов на вопросы
- [ ] Оффлайн-режим (больше кэша)
- [ ] Google Play + App Store публикация

## Важные SQL (выполнить в Supabase Dashboard → SQL Editor)

```sql
-- 1. Разрешить email-пользователям использовать хифз
ALTER TABLE quran_program ALTER COLUMN telegram_id DROP NOT NULL;

-- 2. Проверить тестовые аккаунты
SELECT id, phone, display_name, role FROM users WHERE phone IN ('admin@test.com', 'student@test.com');
```
