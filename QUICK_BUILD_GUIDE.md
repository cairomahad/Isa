# 🚀 БЫСТРЫЙ СТАРТ: Сборка APK

## ✅ Иконка приложения настроена!

**Ваш логотип мечети** уже установлен как иконка приложения:
- 📱 Иконка: `mosque-logo.png`
- 🎨 Splash screen: `mosque-logo.png`
- 📦 Адаптивная иконка Android: `mosque-logo.png`

---

## 📱 САМЫЙ ПРОСТОЙ СПОСОБ СОБРАТЬ APK

### Шаг 1: Установите EAS CLI
```bash
npm install -g eas-cli
```

### Шаг 2: Войдите в Expo
```bash
eas login
```
**Нет аккаунта?** Регистрация: https://expo.dev/signup

### Шаг 3: Перейдите в папку проекта
```bash
cd /путь/к/проекту/frontend
```

### Шаг 4: Соберите APK
```bash
eas build --platform android --profile preview
```

### Шаг 5: Скачайте APK
После сборки (10-15 минут) получите ссылку на скачивание APK.

**Готово!** 🎉 Установите APK на телефон.

---

## 📋 ПРОМПТ ДЛЯ БУДУЩЕЙ СБОРКИ

Скопируйте и используйте этот промпт когда захотите пересобрать APK:

```
Собери APK для моего приложения Tazakkur.

Проект: React Native (Expo)
Папка: /путь/к/tazakkur/frontend

Выполни:
1. Обнови версию в app.json на 1.0.X (инкремент)
2. Проверь что все зависимости установлены (yarn install)
3. Собери APK: eas build --platform android --profile preview
4. Дай мне ссылку на скачивание

Доп. инфо:
- Bundle ID: com.tazakkur.app
- Иконка: mosque-logo.png
- Цвет splash: #F8F6F2
```

---

## 🔄 ИЗМЕНЕНИЕ ВЕРСИИ ПЕРЕД СБОРКОЙ

Каждый раз перед новой сборкой обновляйте версию:

**В файле `/app/frontend/app.json`:**
```json
{
  "expo": {
    "version": "1.0.1",  // ← Увеличьте номер
    "android": {
      "versionCode": 2   // ← Увеличьте код
    }
  }
}
```

---

## 📦 ДВА ТИПА СБОРКИ

### APK (для тестирования)
```bash
eas build -p android --profile preview
```
✅ Быстрая установка на любой телефон
✅ Не требует Google Play
✅ Можно отправить коллегам

### AAB (для Google Play)
```bash
eas build -p android --profile production
```
✅ Для публикации в магазине
✅ Меньший размер
✅ Автоматическая оптимизация

---

## ⚡ ЕЩЁ БЫСТРЕЕ (одной командой)

```bash
cd frontend && eas build -p android --profile preview --non-interactive
```

---

## 🐛 Если что-то не работает

### "Command not found: eas"
```bash
npm install -g eas-cli
```

### "Not logged in"
```bash
eas login
```

### "Project not configured"
```bash
eas build:configure
```

### "Build failed"
Проверьте:
- [ ] Интернет подключен
- [ ] Логин в Expo выполнен
- [ ] `app.json` корректен
- [ ] Все зависимости установлены (`yarn install`)

---

## 📖 Полная документация

Подробные инструкции, включая:
- Локальную сборку
- Публикацию в Google Play
- Создание keystore
- Решение проблем

**Читайте**: `/app/BUILD_APK_GUIDE.md`

---

## ✅ ЧЕКЛИСТ

- [x] Иконка установлена (`mosque-logo.png`)
- [x] `app.json` настроен
- [x] `eas.json` готов
- [ ] Обновите версию перед сборкой
- [ ] Запустите `eas build`
- [ ] Скачайте APK
- [ ] Протестируйте на телефоне

---

**Успешной сборки! 🚀**
