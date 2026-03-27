# 📱 Инструкция по сборке и публикации Tazakkur

## 🎯 Подготовка

### 1. Установка EAS CLI
```bash
npm install -g eas-cli
```

### 2. Авторизация в Expo
```bash
eas login
# Введите email и пароль от Expo аккаунта
```

### 3. Настройка проекта
```bash
cd frontend
eas build:configure
# Выберите: Generate new EAS project
```

---

## 🤖 Android (Google Play)

### Шаг 1: Preview сборка (APK для тестирования)
```bash
yarn build:android

# Или напрямую:
eas build --platform android --profile preview
```

**Результат:** APK файл для установки на устройство  
**Время сборки:** ~10-15 минут  
**Скачать:** Ссылка придет на email или в dashboard

### Шаг 2: Production сборка (AAB для Google Play)
```bash
eas build --platform android --profile production
```

**Результат:** AAB файл для загрузки в Google Play Console

### Шаг 3: Публикация в Google Play

**Вариант A: Через EAS Submit (автоматически)**
```bash
# 1. Создайте Service Account в Google Play Console:
# https://developers.google.com/android-publisher/getting_started

# 2. Скачайте JSON ключ и сохраните как:
# playstore-service-account.json

# 3. Запустите:
yarn submit:android
```

**Вариант B: Вручную**
1. Откройте [Google Play Console](https://play.google.com/console)
2. Создайте новое приложение
3. Заполните описание, скриншоты, иконку
4. Перейдите в "Release" → "Production"
5. Загрузите AAB файл
6. Отправьте на проверку

---

## 🍎 iOS (App Store)

### Шаг 1: Подготовка

**Требования:**
- Apple Developer аккаунт ($99/год)
- Mac с Xcode (для финальной проверки, необязательно)

**Настройка:**
```bash
# 1. Создайте App ID в Apple Developer Portal:
# https://developer.apple.com/account/resources/identifiers/list

# Bundle ID: com.tazakkur.app

# 2. Создайте приложение в App Store Connect:
# https://appstoreconnect.apple.com
```

### Шаг 2: Production сборка
```bash
yarn build:ios

# Или:
eas build --platform ios --profile production
```

**Время сборки:** ~20-30 минут  
**Результат:** IPA файл

### Шаг 3: Публикация в App Store

**Вариант A: Через EAS Submit**
```bash
# Обновите eas.json с вашими данными:
# - appleId: ваш Apple ID email
# - ascAppId: App Store Connect App ID
# - appleTeamId: Team ID из Developer Portal

yarn submit:ios
```

**Вариант B: Вручную**
1. Откройте [App Store Connect](https://appstoreconnect.apple.com)
2. Перейдите в ваше приложение
3. Загрузите IPA через Transporter app
4. Заполните метаданные и скриншоты
5. Отправьте на проверку

---

## 📋 Что нужно подготовить для публикации

### Для обеих платформ:

**1. Иконка приложения**
- Размер: 1024x1024 px
- Формат: PNG без прозрачности
- Сохранить как: `/frontend/assets/images/mosque-logo.png`

**2. Скриншоты**

Android (минимум 2):
- 1080x1920 px (portrait)

iOS (минимум 3):
- 1290x2796 px (iPhone 15 Pro Max)
- 1179x2556 px (iPhone 15 Pro)

**3. Описание приложения**

**Название:** Tazakkur - Исламское образование

**Краткое описание (80 символов):**
```
Изучайте ислам: видео уроки, Коран, намазы, хадисы. Онлайн обучение.
```

**Полное описание:**
```
Tazakkur - современная платформа исламского образования

✅ Видео уроки по фикху (Шафиитский и Ханафитский мазхабы)
✅ Программа заучивания Корана с интервальными повторениями
✅ Времена намазов для вашего города
✅ Ежедневные хадисы, истории и пользы
✅ Домашние задания с аудио и фото
✅ Вопросы преподавателю
✅ Система мотивации и прогресса

Для студентов:
- Структурированные курсы
- Проверка домашних заданий
- Отслеживание прогресса
- Система очков

Для преподавателей:
- Админ панель
- Проверка заданий
- Ответы на вопросы
- Управление контентом

Начните свой путь исламского образования прямо сейчас!
```

**4. Ключевые слова (iOS):**
```
ислам,намаз,коран,хадис,фикх,образование,уроки,обучение,мусульмане,исламский
```

**5. Категория:**
- Android: Education
- iOS: Education

**6. Возрастной рейтинг:**
- 4+ (для всех возрастов)

---

## 🔄 Обновление приложения

### Когда нужно обновить версию:

1. Откройте `/frontend/app.json`
2. Увеличьте версию:
```json
{
  "expo": {
    "version": "1.0.1",  // Было 1.0.0
    "android": {
      "versionCode": 2    // Было 1
    },
    "ios": {
      "buildNumber": "2"  // Было "1"
    }
  }
}
```

3. Пересоберите:
```bash
yarn build:android
yarn build:ios
```

4. Отправьте обновление:
```bash
yarn submit:android
yarn submit:ios
```

---

## 🧪 Тестирование перед публикацией

### 1. Локальное тестирование
```bash
yarn start
# Отсканируйте QR код в Expo Go
```

### 2. Preview сборка (internal testing)
```bash
eas build --platform android --profile preview
# Скачайте APK и установите на устройство
```

### 3. Проверка на разных устройствах
- iPhone (iOS 15+)
- Android (API 21+)
- Разные размеры экранов

### 4. Чек-лист перед публикацией:
- [ ] Все функции работают
- [ ] Авторизация работает (admin/admin123)
- [ ] Backend подключен (обновите URL в .env)
- [ ] Загрузка фото работает
- [ ] Запись аудио работает
- [ ] Нет крашей и ошибок
- [ ] Иконка и splash screen правильные
- [ ] Все разрешения работают

---

## 🐛 Troubleshooting

### Ошибка: "Credentials not found"
```bash
eas credentials
# Выберите: Set up new credentials
```

### Ошибка: "Build failed"
```bash
# Проверьте логи:
eas build:list
# Кликните на failed build для деталей
```

### Ошибка: "Unable to resolve module expo-av"
```bash
cd frontend
yarn add expo-av expo-image-picker
```

### iOS: "Provisioning profile doesn't match"
```bash
eas build:configure
# Пересоздайте профиль
```

---

## 📊 Мониторинг после публикации

### Google Play Console
- Количество установок
- Рейтинг и отзывы
- Крашы и ANR
- Статистика использования

### App Store Connect
- Загрузки
- Отзывы
- Крашы
- Sales and Trends

---

## 🚀 Быстрые команды

```bash
# Сборка для тестирования (APK)
yarn build:android

# Сборка для продакшн (AAB + IPA)
eas build --platform all --profile production

# Публикация в стор
yarn submit:android
yarn submit:ios

# Проверка статуса сборки
eas build:list

# Просмотр логов
eas build:view [BUILD_ID]
```

---

## 📞 Поддержка

**EAS Build документация:**  
https://docs.expo.dev/build/introduction/

**App Store Submit:**  
https://docs.expo.dev/submit/ios/

**Google Play Submit:**  
https://docs.expo.dev/submit/android/

**Проблемы?**  
https://forums.expo.dev/

---

**Готово! Приложение настроено для публикации в Google Play и App Store** 🎉
