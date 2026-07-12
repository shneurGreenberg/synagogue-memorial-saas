# העלאת האתר לאינטרנט — מדריך מלא

## לפני שמתחילים

| מה | איפה |
|----|------|
| קוד | GitHub: `shneurGreenberg/synagogue-memorial-saas` |
| נתונים (184 אנשים) | MongoDB Atlas — כבר מוגדר ב-`.env` אצלך |
| תמונות (134+) | `photos/` במחשב — **חייבות להגיע לשרת** (ראו שלב 1) |

**כתובות אחרי פריסה:**
- לוח זיכרון: `https://<שם>.amvera.io/s/novosibirsk`
- ניהול: `https://<שם>.amvera.io/admin/login` (slug: `novosibirsk`)

---

## שלב 1 — העלאת התמונות ל-GitHub (חובה)

תיקיית `photos/` לא ב-git כברירת מחדל. בלי זה האתר בענן יעבוד **בלי תמונות**.

ב-PowerShell:

```powershell
cd C:\Users\user\synagogue-memorial-saas
git pull origin main

git add -f photos/
git status
git commit -m "Add memorial photos for production deploy"
git push origin main
```

(Repo פרטי — התמונות נשארות רק אצלך ב-GitHub.)

---

## שלב 2 — MongoDB Atlas לפרודקשן

1. https://cloud.mongodb.com → הפרויקט שלך  
2. **Network Access** → `0.0.0.0/0` (Allow from anywhere) — כדי ש-Amvera יתחבר  
3. העתיקו `MONGODB_URI` מ-`.env` (אותו שעובד מקומית)

---

## שלב 3 — Amvera (מומלץ לרוסיה / נובוסיבירסק)

Cloudflare ו-Render לעיתים **חסומים** ברוסיה. Amvera (שרתים ב-RU) עובד טוב יותר.

### 3.1 חשבון ופרויקט

1. הירשמו: https://amvera.ru  
2. **Создать проект** → **Подключить Git**  
3. בחרו repo: `synagogue-memorial-saas`  
4. ענף (branch): **`main`**  
5. Amvera מזהה אוטומטית את `amvera.yaml`

### 3.2 משתני סביבה (Environment)

בלוח הבקרה של Amvera → **Переменные окружения**:

| משתנה | ערך |
|--------|-----|
| `MONGODB_URI` | מחרוזת Atlas המלאה מ-`.env` |
| `SESSION_SECRET` | מחרוזת אקראית ארוכה (32+ תווים) — חובה בפרודקשן |
| `MASTER_ADMIN_PASSWORD` | סיסמת מאסטר חזקה (לא `master`) — חובה בפרודקשן |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |

### 3.3 Deploy

לחצו **Deploy** / המתינו לסיום הבנייה (`npm run build:board`).

כתובת: `https://<project-name>.amvera.io`

### 3.4 בדיקה

- `https://<שם>.amvera.io/s/novosibirsk` — לוח עם שמות ותמונות  
- `https://<שם>.amvera.io/admin/login` — slug: `novosibirsk`, סיסמה: `admin`  
- **שנו סיסמת אדמין מיד!**

---

## שלב 4 — אם אין תמונות באתר החי

1. ודאו ש-`git add -f photos/` ו-`git push` בוצעו **לפני** deploy  
2. ב-Amvera: **Redeploy** / build מחדש  
3. או העלו תמונות דרך אדמין → אנשים → עריכה

---

## חלופות

### Render.com (מחוץ לרוסיה)

1. https://render.com → New Web Service → חיבור GitHub  
2. Branch: `main`  
3. Build: `npm install && npm run build:board`  
4. Start: `npm start`  
5. אותם משתני סביבה כמו ב-Amvera

### VPS + Docker (שרת משלכם)

```bash
git clone https://github.com/shneurGreenberg/synagogue-memorial-saas.git
cd synagogue-memorial-saas
# העתיקו .env ו-photos/
docker compose up -d --build
```

---

## פתרון תקלות

| בעיה | פתרון |
|------|--------|
| האתר לא נפתח ברוסיה | השתמשו ב-Amvera, לא Cloudflare tunnel |
| `bad auth` בלוגים | בדקו `MONGODB_URI`; Network Access ב-Atlas |
| לוח ריק | אותו `MONGODB_URI` כמו מקומי; הריצו `node scripts/seed.js` פעם אחת מקומית |
| בלי תמונות | `git add -f photos/` + push + redeploy |
| לא נכנס לאדמין | cookie: ודאו `TRUST_PROXY=1` ו-`NODE_ENV=production` |

---

## פקודות שימושיות (מקומי)

```powershell
node scripts/check-mongo.js
node scripts/verify-yizkor-import.js --source="C:\Users\user\Downloads\יזכור" --mongo
npm run build:board
```
