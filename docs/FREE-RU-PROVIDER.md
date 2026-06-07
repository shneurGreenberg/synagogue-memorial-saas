# Бесплатный хостинг в России + опция с бэкендом

Рекомендуемая схема для Новосибирска и РФ: **два бесплатных уровня** — только лист (статика) или полный сервер (админка, MongoDB, загрузка фото).

| Режим | Провайдер | Цена | Бэкенд | Админка | Работает в РФ |
|-------|-----------|------|--------|---------|---------------|
| **Только лист** | GitHub Pages | 0 ₽ | нет | нет | да* |
| **Полный сервер** | Amvera + Atlas M0 | 0 ₽ на старте | да | да | да |

\* GitHub иногда недоступен без VPN; лист при этом остаётся статическим и не требует сервера.

Конфигурация всех провайдеров: [`providers.yml`](../providers.yml).

---

## Вариант A — бесплатный лист (без бэкенда)

Подходит, если нужен только **просмотр** на ТВ/планшете, без входа в админку.

1. Включите **GitHub Pages** → Source: **GitHub Actions** (см. [`GITHUB-PAGES.md`](./GITHUB-PAGES.md)).
2. Перед push обновите данные:
   ```bash
   node scripts/import-yizkor.js --sync-json --skip-db   # при необходимости
   git add -f photos/ database.json
   git commit -m "Update memorial for Pages"
   git push origin main
   ```
3. Workflow `deploy-github-pages.yml` соберёт статический сайт в `site/`.
4. URL: `https://<user>.github.io/synagogue-memorial-saas/`

**Ограничения:** нет `/admin`, нет MongoDB, обновление только через git.

---

## Вариант B — бесплатный старт с полным бэкендом (рекомендуется для РФ)

Полный Node.js сервер: лист, админка, сессии, загрузка фото.

### Шаг 1 — MongoDB Atlas M0 (бесплатно навсегда)

1. Регистрация: https://www.mongodb.com/cloud/atlas/register  
2. Кластер **M0 FREE** (любой регион, ближе к вам).  
3. **Database Access** — пользователь с паролем.  
4. **Network Access** → `0.0.0.0/0` (чтобы Amvera подключалась).  
5. Скопируйте `MONGODB_URI` в `.env` локально и проверьте:
   ```bash
   node scripts/seed.js
   node app.js
   ```

### Шаг 2 — фото в Git (обязательно перед деплоем)

```bash
git add -f photos/
git commit -m "Add memorial photos for production"
git push origin main
```

### Шаг 3 — Amvera Cloud (Москва, стартовый баланс 111 ₽)

1. Регистрация: https://amvera.ru  
2. **Создать проект** → подключить GitHub `synagogue-memorial-saas`, ветка `main`.  
3. В корне уже есть `amvera.yaml` — Amvera соберёт SPA и запустит сервер.  
4. Тариф: **Пробный** (0,1 CPU, 100 МБ RAM) — хватает для листа памяти; ~170 ₽/мес после исчерпания стартового баланса.  
5. Переменные окружения в панели Amvera:

   | Переменная | Значение |
   |------------|----------|
   | `MONGODB_URI` | строка Atlas из `.env` |
   | `SESSION_SECRET` | длинная случайная строка (32+ символов) |
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `1` |

6. **Deploy** → дождитесь сборки (`npm run build:board`).

### Шаг 4 — проверка

| Что | URL |
|-----|-----|
| Лист | `https://<проект>.amvera.io/s/novosibirsk` |
| Админ | `https://<проект>.amvera.io/admin/login` (slug: `novosibirsk`, пароль: `admin`) |

**Сразу смените пароль админа** после первого входа.

Полная инструкция с фото и Atlas: [`GO-LIVE.md`](./GO-LIVE.md).

---

## Сравнение с другими провайдерами

| Провайдер | Бесплатно | Бэкенд | Россия |
|-----------|-----------|--------|--------|
| **Amvera + Atlas M0** | стартовый баланс + M0 | да | да |
| **GitHub Pages** | да | нет | частично |
| **Render** (`render.yaml`) | да | да | часто блокируется |
| **Cloudflare Tunnel** | да | да | **не использовать в РФ** |
| **Serveo** (туннель) | да | да | только для тестов |
| **Docker VPS** | нет | да | да |

---

## Тест из России без деплоя (временный URL)

Для демо на несколько часов:

```bash
PORT=3000 SESSION_SECRET=your-secret node app.js
./scripts/start-dual-tunnels.sh
```

В файле `/tmp/kadish-public-urls.txt` будет **Serveo** URL (работает в РФ без VPN).  
Подробнее: [`DUAL-ENV.md`](./DUAL-ENV.md).

---

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| Сайт не открывается в РФ | Amvera или VPS, не Cloudflare/Render |
| Нет фото на Amvera | `git add -f photos/` + push + redeploy |
| Не входит в админку | `TRUST_PROXY=1`, `NODE_ENV=production` |
| `bad auth` в логах | проверьте `MONGODB_URI`, Network Access в Atlas |
| Баланс Amvera = 0 | пополните или остановите проект (заморозка через 30 дней) |
