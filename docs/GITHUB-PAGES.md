# GitHub Pages — לוח זיכרון סטטי

GitHub Pages מגיש **קבצים סטטיים בלבד** (ללא Node.js / MongoDB). לוח הזיכרון נבנה מ-`database.json` + `photos/`.

**כתובת:** `https://<username>.github.io/synagogue-memorial-saas/`

> פאנל אדמין **לא** עובד ב-Pages. לעריכה: מקומית + MongoDB, או Amvera (ראו `GO-LIVE.md`).

---

## שלב 1 — הכנת הנתונים והתמונות

```powershell
cd C:\Users\user\synagogue-memorial-saas
git pull origin main

# עדכון database.json מהתיקייה שלך (אם צריך)
node scripts/import-yizkor.js --source="C:\Users\user\Downloads\יזכור" --sync-json --skip-db

# תמונות חובה ב-git
git add -f photos/
git add database.json
git commit -m "Update data and photos for GitHub Pages"
git push origin main
```

---

## שלב 2 — הפעלת GitHub Pages

1. GitHub → repo **synagogue-memorial-saas**  
2. **Settings** → **Pages**  
3. **Build and deployment** → Source: **GitHub Actions**  
4. אחרי `git push` ל-`main`, workflow **Deploy GitHub Pages** רץ אוטומטית  
5. **Actions** → בדקו שירוק ✓ (2–4 דקות)

---

## שלב 3 — בדיקה מקומית (אופציונלי)

```powershell
npm run build:pages
npx serve site
```

פתחו: http://localhost:3000/synagogue-memorial-saas/ (או הנתיב ש-`serve` מציג)

---

## עדכון האתר אחרי שינויים

1. ערכו `database.json` / תמונות מקומית  
2. `git add` + `commit` + `push` ל-`main`  
3. GitHub Actions בונה ומפרסם מחדש אוטומטית

---

## פתרון תקלות

| בעיה | פתרון |
|------|--------|
| 404 על Pages | Settings → Pages → Source = GitHub Actions |
| דף לבן | Actions → לוג שגיאות; הריצו `npm run build:pages` מקומית |
| בלי תמונות | `git add -f photos/` ו-push |
| נתונים ישנים | `import-yizkor --sync-json` ו-push את `database.json` |
| שעות שבת לא נטענות | דורש אינטרנט (Hebcal API מהדפדפן) |

---

## מגבלות

- אין אדמין בענן  
- אין עדכון אוטומטי מ-MongoDB — רק מ-git  
- repo ציבורי = נתונים ותמונות גלויים (שקלו repo **Private** + Pages ממנוי)
