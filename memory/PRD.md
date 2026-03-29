# Tazakkur App — PRD

## Описание
Исламское образовательное мобильное приложение (Expo SDK 54 / React Native).  
Backend: FastAPI на Railway. БД: Supabase (PostgreSQL).

## Архитектура
- Frontend: React Native / Expo SDK 54, expo-router, Zustand, TypeScript
- Backend: FastAPI (server.py) → Railway
- DB: Supabase (kmhhazpyalpjwspjxzry.supabase.co)
- Backend URL: https://tazakkur-production-c8c9.up.railway.app

## Что реализовано (Февраль 2026)

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
