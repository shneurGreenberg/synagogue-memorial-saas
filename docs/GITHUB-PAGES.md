# GitHub Pages — לוח זיכרון סטטי

**כתובת נכונה:** `https://shneurGreenberg.github.io/synagogue-memorial-saas/`

(שימו לב לשם המדויק של ה-repo — לא `synagogue-memorial` בלבד)

---

## הפעלה (פעם אחת)

1. GitHub → **Settings** → **Pages** → Source: **GitHub Actions**
2. ודאו שאין workflow ישן `static.yml` (נמחק — משתמשים רק ב-`deploy-github-pages.yml`)

---

## לפני כל פריסה

```powershell
cd C:\Users\user\synagogue-memorial-saas
git pull origin main

node scripts/import-yizkor.js --source="C:\Users\user\Downloads\יזכור" --sync-json --skip-db

git add -f photos/
git add database.json
git commit -m "Update memorial data for Pages"
git push origin main
```

---

## מה קורה אחרי push

Workflow **Deploy GitHub Pages**:
1. `npm run build:pages` → תיקיית `site/` עם `index.html`
2. מעלה רק את `site/` (לא את כל הפרויקט)

בדיקה: **Actions** → **Deploy GitHub Pages** → ✓ ירוק → פתחו את ה-URL למעלה.

---

## שגיאת "File not found"

| סיבה | פתרון |
|------|--------|
| URL שגוי | השתמשו ב-`/synagogue-memorial-saas/` בסוף |
| workflow `static.yml` | מחקו אותו — העלה את כל ה-repo בלי `index.html` |
| בלי תמונות | `git add -f photos/` + push |
| Actions נכשל | פתחו את הלוג ב-Actions |

---

## מגבלות

- אין פאנל אדמין ב-Pages  
- עדכון נתונים = push ל-`database.json` + `photos/`
