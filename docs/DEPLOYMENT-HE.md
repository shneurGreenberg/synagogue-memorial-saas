# פריסת לוח הזיכרון — נובוסיבירסק (מדריך בעברית)

מדריך זה מסביר איך להעלות את האתר לאינטרנט עם הנתונים והתמונות מהמחשב שלך (`C:\Users\user\Downloads\יזכור`).

## מה יש בפרויקט

| רכיב | תיאור |
|------|--------|
| **לוח זיכרון (טלוויזיה / מחשב)** | `https://<הדומיין>/s/novosibirsk` |
| **ניהול (אדמין)** | `https://<הדומיין>/admin/login` — slug: `novosibirsk`, סיסמה: `admin` (שנו אחרי הפריסה) |
| **נתונים** | `database.json` — רשימת הנפטרים |
| **תמונות** | תיקיית `photos/` — קבצים כמו `148.jpg` לפי השדה `photo` בכל רשומה |

הקוד נמצא ב-GitHub: `shneurgreenberg/synagogue-memorial-saas`.

---

## שלב 1 — הכנת התיקייה במחשב Windows

1. ודאו שבתיקייה `C:\Users\user\Downloads\יזכור` יש:
   - קובץ **`database.json`** (אותו פורמט כמו בפרויקט — מקטע `data.people`)
   - תמונות — בתת-תיקייה `photos` **או** באותה תיקייה, עם **אותם שמות קבצים** כמו בשדה `photo` ב-JSON
2. פתחו PowerShell בתיקיית הפרויקט (אחרי `git clone`):

```powershell
cd C:\path\to\synagogue-memorial-saas
copy .env.example .env
npm install
```

3. הגדירו MongoDB ב-`.env` (ראו שלב 2).

---

## שלב 2 — מסד נתונים (MongoDB Atlas — חינם)

1. הירשמו: https://www.mongodb.com/cloud/atlas/register  
2. צרו cluster חינמי (M0).  
3. Database Access → משתמש + סיסמה.  
4. Network Access → **Allow access from anywhere** (0.0.0.0/0) לפריסה בענן.  
5. העתיקו מחרוזת חיבור והדביקו ב-`.env`:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster....mongodb.net/synagogue?retryWrites=true&w=majority
SESSION_SECRET=מחרוזת-אקראית-ארוכה
PORT=3000
```

6. טעינת נתונים ראשונית:

```powershell
node scripts/seed.js
```

---

## שלב 3 — ייבוא הנתונים והתמונות מ「יזכור」

מהשורש של הפרויקט:

```powershell
node scripts/import-yizkor.js --source="C:\Users\user\Downloads\יזכור" --force --sync-json
npm run build:board
node app.js
```

בדפדפן: http://localhost:3000/s/novosibirsk  

אם התמונות לא מופיעות — בדקו שהשמות ב-`photo` תואמים לשמות הקבצים בתיקייה.

---

## שלב 4 — פריסה לאינטרנט (גישה מכל מחשב)

### א. רוסיה / נובוסיבירסק (מומלץ) — Amvera

Cloudflare ו-Render לעיתים **חסומים** ברוסיה. השתמשו ב-Amvera (שרתים במוסקבה):

1. https://amvera.ru — חשבון + חיבור ל-GitHub repo.  
2. בפרויקט כבר קיים `amvera.yaml` — Amvera יריץ `npm run build:board` ואת השרת.  
3. בממשק Amvera הגדירו משתני סביבה:
   - `MONGODB_URI` — אותה מחרוזת Atlas
   - `SESSION_SECRET` — אקראי
   - `NODE_ENV` = `production`
4. MongoDB: Atlas או Mongo מנוהל ב-Amvera.  
5. **תמונות בפרודקשן:**  
   - העלו את תיקיית `photos/` ל-repo הפרטי (אפשר להסיר את `photos/` מ-`.gitignore` זמנית), **או**  
   - אחרי הפריסה: אדמין → עריכת אנשים → העלאת תמונה לכל רשומה.  
6. אחרי deploy: `https://<שם-פרויקט>.amvera.io/s/novosibirsk`

פרטים נוספים: [DEPLOYMENT-RU.md](./DEPLOYMENT-RU.md)

### ב. VPS ב-Russia (Docker)

על שרת עם Docker:

```bash
git clone https://github.com/shneurgreenberg/synagogue-memorial-saas.git
cd synagogue-memorial-saas
# העתיקו photos/ ו-.env לשרת
docker compose up -d --build
```

פתחו פורט 3000 או nginx מולו. ב-`docker-compose.yml` מומלץ volume ל-`photos` (ראו עדכון בפרויקט).

### ג. Render / שירותים מערביים

מתאים אם הגולשים **לא** ברוסיה. `render.yaml` בקוד — חיבור Atlas + `MONGODB_URI` בלוח הבקרה.

---

## שלב 5 — אבטחה אחרי עלייה לאוויר

1. התחברו ל-`/admin/login` (slug: `novosibirsk`).  
2. **שנו סיסמת אדמין** מ-`admin` לסיסמה חזקה (בלוח הניהול / MongoDB).  
3. ב-Atlas הגבילו IP אם אפשר (לאחר ש-Amvera יציב).

---

## פתרון תקלות

| בעיה | פתרון |
|------|--------|
| האתר לא נפתח ברוסיה | השתמשו ב-Amvera או VPS רוסי, לא Cloudflare tunnel |
| אין תמונות | הריצו `import-yizkor` שוב; ודאו ש-`photos/` קיים על השרת |
| שגיאת MongoDB | בדקו `MONGODB_URI`, סיסמה, Network Access ב-Atlas |
| לוח ריק אחרי deploy | `node scripts/restore-novosibirsk.js --force` על השרת (עם `.env`) |

---

## פקודות שימושיות

```bash
node scripts/import-yizkor.js --source="..." --force
node scripts/restore-novosibirsk.js --force
npm run build:board
```

לשאלות טכניות באנגלית/רוסית: `QUICKSTART.md`, `SETUP_INSTRUCTIONS.md`, `DEPLOYMENT.md`.
