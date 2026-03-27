# КРАТКИЙ ПРОМПТ ДЛЯ CLAUDE

Привет! Тебе передан проект **Tazakkur** - исламское мобильное приложение (Expo + FastAPI + MongoDB).

## 📍 ТЕКУЩЕЕ СОСТОЯНИЕ:

✅ **Frontend полностью готов** - 8 экранов работают:
- Главная (dashboard с аятом дня, следующим намазом)
- Зикр (интерактивный счетчик с круговым прогрессом)
- Вопросы Шейху (форма + история)
- Возмещение намазов (трекер для 5 намазов)
- Намазы, Хадисы, Рейтинг, Настройки

✅ **Установлено**: react-native-svg, expo-haptics, все зависимости
✅ **Preview работает**: https://cli-app-runner.preview.emergentagent.com

## 🔴 НУЖНО СДЕЛАТЬ:

### 1. Backend API (FastAPI + MongoDB)

**Создать 3 основных API:**

**A. Dhikr API** (`/api/dhikr/*`):
- POST `/progress` - сохранить прогресс
- POST `/complete` - завершить зикр → начислить очки
- GET `/progress/{user_id}` - получить прогресс

**B. Questions API** (`/api/questions/*`):
- POST `/` - создать вопрос
- GET `/{user_id}` - получить вопросы пользователя
- PUT `/{id}/answer` - ответить (только админ)

**C. Missed Prayers API** (`/api/missed-prayers/*`):
- GET `/{user_id}` - получить счетчики
- PUT `/{user_id}` - обновить счетчики
- POST `/{user_id}/mark` - отметить возмещение → очки

**D. Points System**:
- Зикр завершен: +5-10 очков
- Намаз возмещен: +3 очка
- Урок просмотрен: +10 очков

### 2. MongoDB Collections (создать):
```javascript
dhikr_progress: { user_id, dhikr_id, count, goal, completed, points_earned, date }
questions: { id, user_id, question_text, answer_text, status, created_at, answered_at }
missed_prayers: { user_id, fajr, zuhr, asr, maghrib, isha, total, last_updated }
```

### 3. Обновить модель users:
Добавить: `points`, `total_dhikr_completed`, `streak_days`, `last_active`

### 4. Подключить Frontend к Backend:
- `zikr.tsx` → API calls вместо TODO
- `qa.tsx` → API calls
- `missed-prayers.tsx` → API calls

## 📂 ВАЖНЫЕ ФАЙЛЫ:

```
/app/backend/server.py           # Добавить API сюда
/app/frontend/app/(tabs)/zikr.tsx
/app/frontend/app/(tabs)/qa.tsx
/app/frontend/app/(tabs)/missed-prayers.tsx
/app/HANDOFF_PROMPT.md          # Полная документация
```

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ:

**URLs:**
- Frontend: `https://cli-app-runner.preview.emergentagent.com`
- Backend API: `https://cli-app-runner.preview.emergentagent.com/api`

**MongoDB:**
- Connection: `mongodb://localhost:27017`
- Database: `tazakkur_db`

**API Router:** Все routes через `api_router` с префиксом `/api`

**Restart:**
```bash
sudo supervisorctl restart backend  # После изменений в backend
sudo supervisorctl restart expo     # Если нужно обновить frontend
```

## ⚠️ КРИТИЧНО:

1. ✅ `react-native-svg` УЖЕ УСТАНОВЛЕН - не переустанавливай
2. ✅ Все API routes ДОЛЖНЫ иметь префикс `/api`
3. ✅ Frontend файлы НЕ ТРОГАТЬ - они работают
4. ✅ Использовать `@api_router` в server.py, НЕ `@app`

## 🎯 ПОРЯДОК РАБОТЫ:

1. Создай Pydantic модели для новых коллекций
2. Создай CRUD endpoints для dhikr, questions, missed_prayers
3. Подключи Frontend к Backend (заменить TODO на API calls)
4. Протестируй через `deep_testing_backend_v2`

## 📝 ИТОГ:

**Frontend готов → Нужен Backend → Подключить → Протестировать**

Цель: Полностью рабочее приложение где пользователь может:
- Считать зикр и получать очки
- Задавать вопросы Шейху
- Трекать пропущенные намазы
- Видеть свои очки и рейтинг

**Начинай с Backend API в `/app/backend/server.py`**

