# Развёртывание для пользователей из России

## Почему не открывается trycloudflare.com

Временный URL через **Cloudflare Tunnel** (`trycloudflare.com`) в России часто **не работает без VPN**: провайдеры ограничивают доступ к инфраструктуре Cloudflare.

**Не используйте Cloudflare Tunnel** для листа памяти в РФ.

## Постоянный хостинг в России (рекомендуется)

### Amvera Cloud (Москва)

1. Регистрация: https://amvera.ru (есть стартовый баланс)
2. Создать приложение → привязать GitHub `synagogue-memorial-saas`, ветка **`main`**
3. В корне репозитория уже есть `amvera.yaml`
4. **Перед деплоем** загрузите фото в Git: `git add -f photos/ && git push` (см. `docs/GO-LIVE.md`)
5. В настройках приложения задать переменные:
   - `MONGODB_URI` — строка подключения MongoDB Atlas
   - `SESSION_SECRET` — длинная случайная строка
   - `NODE_ENV` = `production`
   - `TRUST_PROXY` = `1`
6. После деплоя: `https://<имя-проекта>.amvera.io`

**Лист:** `https://<имя>.amvera.io/s/novosibirsk`  
**Админ:** `https://<имя>.amvera.io/admin/login` (slug: `novosibirsk`, пароль после seed: `admin`)

Полная инструкция: **`docs/GO-LIVE.md`**

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
