# Tazakkur App — PRD

## Описание
Исламское образовательное мобильное приложение (Expo SDK 54 / React Native).  
Backend: FastAPI на Railway. БД: Supabase (PostgreSQL).

## Архитектура
- Frontend: React Native / Expo SDK 54, expo-router, Zustand, TypeScript
- Backend: FastAPI (server.py) → Railway
- DB: Supabase (kmhhazpyalpjwspjxzry.supabase.co)
- Backend URL: https://tazakkur-production-c8c9.up.railway.app

## Что реализовано (Февраль 2026, последнее обновление)

### Задачи 1–11 (базовые улучшения)
[описание выше]

### Умма — Исламская социальная лента
- **Backend**: 7 endpoints — GET /api/umma/feed, POST /api/umma/post, POST /like, DELETE, POST /report, GET /admin/umma/reports, GET migration-sql
- **Проверка прав**: пользователи могут публиковать только после завершения fard_shafi или fard_hanafi курса
- **ummaStore.ts**: Zustand с оптимистичным UI для лайков, пагинацией, checkCanPost
- **PostCard.tsx**: FadeIn+SlideUp анимация, bounce на лайке, 3 типа (text/quote/question), арабский текст для цитат
- **NewPostModal.tsx**: слайд-ап модалка, выбор типа, поля для цитат, валидация
- **umma.tsx**: FlatList лента, FAB кнопка, lock-баннер для незавершивших курс, pull-to-refresh, пагинация
- **_layout.tsx**: центральная золотая кнопка "Умма" поднята на 18px над таббаром
- **admin/umma-reports.tsx**: модерация жалоб с кнопкой "Скрыть пост"

### ВАЖНО: Создать таблицы в Supabase
Открыть: https://supabase.com/dashboard/project/kmhhazpyalpjwspjxzry/editor
Выполнить SQL из файла: /app/backend/umma_migration.sql
Или получить через: GET /api/admin/umma/migration-sql

### Задача 1 — YouTube видеоуроки
- manage-lessons.tsx: убрана загрузка файлов, добавлено поле YouTube URL
- lesson/[id].tsx: YoutubePlayer вместо placeholder (react-native-youtube-iframe)
- backend: extract_youtube_id() + обновлён CreateLessonRequest + POST /api/admin/lessons

### Задача 2 — Квизы: отображение вариантов ответов
- Реальная схема quiz_tasks: option_a/b/c/d + correct_option (letter a/b/c/d)
- lesson/[id].tsx: rewrite квиза — правильное отображение, цветная обратная связь
- Экран результатов: только итоговый счёт + очки
- backend: /quiz/{lesson_id} возвращает options как массив, correct_option как int (0-based)

### Задача 3 — Админ: добавление вопросов к тесту
- admin/manage-quiz.tsx: новый экран с dropdown уроков, textarea для bulk-ввода
- backend: POST /api/admin/quiz/batch (batch insert в quiz_tasks)

### Задача 4 — useFocusEffect на всех экранах
- useFocusEffect добавлен: index.tsx, zikr.tsx, hadiths.tsx, rating.tsx, lessons.tsx

### Задача 5 — Таймер намаза
- getNextPrayer() исправлен: обрабатывает "(EEST)" суффиксы в времени

### Задача 6 — Поиск: открытие результатов
- search.tsx: навигация для всех типов результатов

### Задача 7 — Рейтинг: топ-10
- rating.tsx: топ-10, backend фильтрует zikr_count > 0

### Задача 8 — Тёмная тема
- DarkColors полный набор свойств, useColors() хук
- Обновлены все ключевые экраны на makeStyles(Colors) паттерн

### Задача 9 — Зикр UX
- Убран текст "Нажмите здесь", минималистичная кнопка
- Volume buttons через react-native-volume-manager

### Задача 10 — Навигация
- 5 вкладок: Главная | Уроки | Зикр | Рейтинг | Ещё
- Намазы доступны через settings.tsx

### Задача 11 — Категории курсов
- fard_shafi, fard_hanafi, arab, family

## Зависимости добавлены
- react-native-youtube-iframe: ^2.4.1
- react-native-volume-manager: ^2.0.8

## Следующие задачи (P0)
1. Задеплоить backend на Railway (server.py изменён)
2. EAS Build для тестирования react-native-volume-manager
3. Обновить profile.tsx, quran.tsx, prayers.tsx на useColors()

## Хифз Корана — план интеграции (Март 2026)
Подробное руководство: `/app/HIFZ_INTEGRATION_GUIDE.md`

### Шаги интеграции:
1. SQL в Supabase — создать таблицы `quran_program` и `quran_progress`
2. Backend — добавить `/api/quran/*` эндпоинты в `server.py`
3. Frontend — переписать `QuranService.ts` (API вместо прямого Supabase)
4. Frontend — обновить `lesson.tsx` (текст с API + правильный playAudio)
5. Frontend — обновить `review.tsx` (Panel A / Panel B логика)
6. Frontend — обновить `quran.tsx` (дашборд с прогрессом)

### Ключевые особенности донорского кода (cairomahad/Isa):
- Идентификация: user_id (Supabase UUID), а не telegram_id
- Аудио CDN: everyayah.com/data/Abdul_Basit_Murattal_192kbps/
- Panel A: < 25 аятов — всё сплошным списком
- Panel B: ≥ 25 аятов — вчерашние + блок по 25 с ротацией каждый день
- Очки: +10 за каждый аят в уроке, +5 за повторение
