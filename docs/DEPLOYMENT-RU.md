# Развёртывание для пользователей из России

## Почему не открывается trycloudflare.com

Временный URL через **Cloudflare Tunnel** (`trycloudflare.com`) в России часто **не работает без VPN**: провайдеры ограничивают доступ к инфраструктуре Cloudflare.

**Не используйте Cloudflare Tunnel** для листа памяти в РФ.

## Быстрый доступ (временный, без Cloudflare)

Туннель **Serveo** (не Cloudflare):

- См. актуальный URL в панели агента / у разработчика
- Формат: `https://….serveousercontent.com`

## Постоянный хостинг в России (рекомендуется)

### Amvera Cloud (Москва)

1. Регистрация: https://amvera.ru (есть стартовый баланс)
2. Создать приложение → привязать GitHub `synagogue-memorial-saas`, ветка `cursor/spa-vite-migration-ac8f`
3. В корне репозитория уже есть `amvera.yaml`
4. В настройках приложения задать переменные:
   - `MONGODB_URI` — строка подключения MongoDB (кластер Amvera или свой)
   - `SESSION_SECRET` — длинная случайная строка
   - `NODE_ENV` = `production`
5. Создать MongoDB в панели Amvera (или Atlas; к серверу подключается только приложение, не браузер пользователя)
6. После деплоя: `https://<имя-проекта>.amvera.io`

**Лист:** `https://<имя>.amvera.io/s/novosibirsk`  
**Админ:** `https://<имя>.amvera.io/admin/novosibirsk` (пароль по умолчанию после seed: `admin`)

### Свой VPS в РФ (Docker)

```bash
docker compose up -d --build
```

Открыть порт 3000 или поставить nginx. Файлы: `Dockerfile`, `docker-compose.yml`.

## Сборка перед деплоем

```bash
npm install
npm run build:board
```

На Amvera сборка выполняется автоматически (`build.additionalCommands` в `amvera.yaml`).
