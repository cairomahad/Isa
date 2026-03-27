# 🔧 Инструкции по настройке Supabase

## Добавление поля `role` в таблицу `users`

Для полноценной работы приложения необходимо добавить колонку `role` в таблицу `users`.

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте ваш проект Supabase: https://supabase.com/dashboard/project/kmhhazpyalpjwspjxzry
2. Перейдите в раздел **Table Editor**
3. Выберите таблицу **users**
4. Нажмите **"+ New Column"**
5. Заполните:
   - **Name:** `role`
   - **Type:** `text`
   - **Default Value:** `'student'`
   - **Is Nullable:** ❌ (No)
6. Сохраните изменения

### Вариант 2: Через SQL Editor

1. Откройте SQL Editor в Supabase Dashboard
2. Выполните следующий SQL запрос:

```sql
-- Add role column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- Set admin role for admin user
UPDATE users 
SET role = 'admin' 
WHERE phone = 'admin';

-- Ensure all other users are students
UPDATE users 
SET role = 'student' 
WHERE phone != 'admin';
```

3. Нажмите **Run**

### Проверка

После выполнения любого из вариантов:

```sql
-- Check all users
SELECT phone, display_name, role FROM users;
```

Вы должны увидеть:
- `phone='admin'` → `role='admin'`
- Все остальные → `role='student'`

---

## ⚠️ Временное решение

Пока поле `role` не добавлено, приложение будет использовать **временную проверку**:
- Пользователь с `phone='admin'` считается админом
- Все остальные - студенты

**Это работает, но рекомендуется добавить поле `role` для правильной архитектуры БД.**
