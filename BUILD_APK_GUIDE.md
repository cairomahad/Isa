# 📱 СБОРКА APK ПРИЛОЖЕНИЯ TAZAKKUR

## 🎨 ИКОНКА ПРИЛОЖЕНИЯ

### Текущая конфигурация:
✅ Иконка уже настроена в `app.json`:
- **Icon**: `./assets/images/mosque-logo.png` (1024x1024px)
- **Adaptive Icon**: `./assets/images/adaptive-icon.png` (для Android)
- **Splash Screen**: `./assets/images/splash-icon.png`

### Если хотите заменить иконку:

1. **Подготовьте изображения:**
   - Основная иконка: **1024x1024px** PNG (без прозрачности)
   - Адаптивная иконка (Android): **1024x1024px** PNG
   - Splash screen: **1284x2778px** PNG

2. **Замените файлы:**
   ```bash
   # Положите ваши изображения вместо существующих:
   /app/frontend/assets/images/mosque-logo.png      # iOS/Android иконка
   /app/frontend/assets/images/adaptive-icon.png     # Android адаптивная
   /app/frontend/assets/images/splash-icon.png       # Экран загрузки
   ```

3. **Или используйте онлайн генератор:**
   - Зайдите на https://easyappicon.com/
   - Загрузите изображение 1024x1024px
   - Скачайте все размеры для iOS и Android
   - Замените файлы в `/app/frontend/assets/images/`

---

## 🚀 СБОРКА APK (3 СПОСОБА)

### ✅ **СПОСОБ 1: EAS BUILD (Рекомендуется)**

Это официальный способ от Expo. Сборка происходит в облаке.

#### Шаг 1: Установка EAS CLI
```bash
npm install -g eas-cli
```

#### Шаг 2: Вход в Expo аккаунт
```bash
eas login
```
*Если нет аккаунта:*
```bash
eas register
# или зарегистрируйтесь на https://expo.dev/signup
```

#### Шаг 3: Настройка проекта
```bash
cd /путь/к/tazakkur/frontend
eas build:configure
```

#### Шаг 4: Сборка APK (Preview версия)
```bash
# APK для тестирования (можно установить напрямую на телефон)
eas build --platform android --profile preview

# Или AAB для Google Play
eas build --platform android --profile production
```

#### Шаг 5: Скачивание APK
После сборки (~5-15 минут) EAS даст ссылку на скачивание APK.
Или зайдите на https://expo.dev/accounts/[ваш-username]/projects/tazakkur/builds

---

### ⚡ **СПОСОБ 2: Локальная сборка с Expo**

Требует Android Studio и Java.

#### Шаг 1: Установка Android Studio
```bash
# Скачайте с https://developer.android.com/studio
# Установите Android SDK (API 34 или новее)
```

#### Шаг 2: Переменные окружения
```bash
# Добавьте в ~/.zshrc или ~/.bash_profile:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Примените изменения:
source ~/.zshrc
```

#### Шаг 3: Prebuild и сборка
```bash
cd /путь/к/tazakkur/frontend

# Создать нативные папки
npx expo prebuild --platform android

# Собрать APK
cd android
./gradlew assembleRelease

# APK будет в:
# android/app/build/outputs/apk/release/app-release.apk
```

---

### 🔨 **СПОСОБ 3: Использование Expo Application Services (простейший)**

#### Одна команда:
```bash
cd /путь/к/tazakkur/frontend
npx expo build:android
```

*Примечание: Этот способ устарел, используйте EAS Build (Способ 1)*

---

## 📋 ПРОМПТ ДЛЯ СБОРКИ APK

### Копируйте и используйте этот промпт:

```
Мне нужно собрать APK для моего React Native (Expo) приложения Tazakkur.

Проект находится в: /путь/к/tazakkur/frontend

Пожалуйста, выполни следующие шаги:

1. Проверь и обнови app.json:
   - name: "Tazakkur"
   - version: "1.0.0"
   - bundleIdentifier (iOS): "com.tazakkur.app"
   - package (Android): "com.tazakkur.app"

2. Убедись, что все иконки на месте:
   - assets/images/mosque-logo.png
   - assets/images/adaptive-icon.png
   - assets/images/splash-icon.png

3. Собери APK используя EAS Build:
   - eas build --platform android --profile preview

4. После сборки:
   - Дай мне ссылку на скачивание APK
   - Проверь размер файла
   - Убедись, что version и versionCode корректны

Дополнительно:
- Если нужно подписать APK для Google Play, используй production профиль
- Если нужно локальную сборку, помоги настроить Android Studio
```

---

## 🔐 ПОДПИСЬ APK ДЛЯ PRODUCTION

Для публикации в Google Play нужен keystore.

### Создание keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore tazakkur-release.keystore \
  -alias tazakkur-key \
  -keyalg RSA -keysize 2048 -validity 10000

# Введите пароль (сохраните его!)
# Заполните информацию о компании
```

### Настройка в eas.json:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "aab",
        "credentialsSource": "local"
      }
    }
  }
}
```

### Хранение keystore:
```bash
# Положите keystore в безопасное место:
# НЕ КОММИТЬТЕ В GIT!

# Добавьте в .gitignore:
echo "*.keystore" >> .gitignore
```

---

## 📦 ГОТОВЫЕ КОМАНДЫ

### Быстрая сборка тестового APK:
```bash
cd frontend
eas build -p android --profile preview --non-interactive
```

### Сборка для Google Play:
```bash
cd frontend
eas build -p android --profile production
```

### Сборка для iOS:
```bash
cd frontend
eas build -p ios --profile production
```

### Сборка для обеих платформ:
```bash
cd frontend
eas build --platform all --profile production
```

---

## 🧪 ТЕСТИРОВАНИЕ APK

### На реальном устройстве:
1. Скачайте APK на телефон
2. Разрешите установку из неизвестных источников
3. Установите APK
4. Запустите приложение

### На эмуляторе:
```bash
# Запустите Android Studio Emulator
# Перетащите APK в окно эмулятора
# Или:
adb install /путь/к/app.apk
```

---

## 🐛 ЧАСТЫЕ ПРОБЛЕМЫ

### 1. "Android SDK not found"
```bash
# Установите Android Studio и SDK
# Настройте ANDROID_HOME (см. Способ 2)
```

### 2. "Java version mismatch"
```bash
# Установите Java 17:
brew install openjdk@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### 3. "Build failed - out of memory"
```bash
# Увеличьте память для Gradle:
# В android/gradle.properties:
org.gradle.jvmargs=-Xmx4096m
```

### 4. "Credentials not configured"
```bash
# Настройте credentials:
eas credentials
```

---

## 📱 ПУБЛИКАЦИЯ В GOOGLE PLAY

### Шаг 1: Создание приложения
1. Зайдите в https://play.google.com/console
2. Создайте новое приложение
3. Заполните информацию

### Шаг 2: Загрузка AAB
```bash
# Соберите AAB (не APK):
eas build -p android --profile production

# Скачайте AAB
# Загрузите в Google Play Console → Production → Create new release
```

### Шаг 3: Заполнение информации
- Описание приложения (русский + английский)
- Скриншоты (минимум 2 для телефонов, 2 для планшетов)
- Иконка (512x512px)
- Feature graphic (1024x500px)
- Privacy Policy URL

### Шаг 4: Отправка на проверку
- Заполните Content Rating
- Выберите целевую аудиторию
- Отправьте на проверку

*Проверка занимает 1-3 дня*

---

## 📝 CHECKLIST ПЕРЕД СБОРКОЙ

- [ ] Проверил `app.json` (name, version, bundleIdentifier)
- [ ] Проверил `eas.json` (профили сборки)
- [ ] Заменил иконки (если нужно)
- [ ] Обновил `.env` с production URLs
- [ ] Протестировал приложение локально
- [ ] Выполнил SQL миграции в Supabase
- [ ] Проверил все API endpoints
- [ ] Обновил версию в `app.json`
- [ ] Создал keystore (для production)
- [ ] Сохранил пароли в надёжном месте

---

## 🎯 ИТОГО

**Для быстрого тестирования:**
```bash
eas build --platform android --profile preview
```

**Для публикации:**
```bash
eas build --platform android --profile production
```

**Результат:**
- APK/AAB готов через 10-15 минут
- Скачайте по ссылке из EAS
- Установите на телефон или загрузите в Google Play

---

## 📞 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- Документация EAS Build: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
- Android Publishing Guide: https://docs.expo.dev/submit/android/
- iOS Publishing Guide: https://docs.expo.dev/submit/ios/

---

**Готово! 🎉 Следуйте инструкциям выше для сборки APK.**
