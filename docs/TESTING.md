# Testing / בדיקות

## הרצה מקומית

```bash
npm test
```

בלי MongoDB מקומי: בדיקות אינטגרציה (`test/smoke.test.js`, `test/grave-scan.test.js` — בלוק HTTP) מדלגות אוטומטית. עם מסד: הגדירו `MONGODB_URI` והריצו `node scripts/seed.js` לפני smoke.

```bash
npm run release:check   # בדיקות + build:board + build:css
```

## CI

Workflow `.github/workflows/test.yml` — `npm ci`, `npm test`, `npm run build:board`, `npm run build:css` על Node 20.

---

## Regression (CHANGELOG 1.10–1.15)

ממופה ב־`test/regression-manifest.js` (קבצי בדיקה לכל תיקון: טפסי אדמין, Chumash, חגים, תצוגות שמורות, MyMemory, ב״ה, QR, cache-bust וכו').

## Invariants (בידוד ואבטחה)

רשימה מלאה: `test/invariants-manifest.js`

| ID | תחום | תיאור קצר |
|----|------|-----------|
| tenant-board-payload | בידוד | API ציבורי בלי שדות פרטיים |
| tenant-admin-slug-mismatch | בידוד | אדמין קהילה A לא נכנס ל־/admin/B |
| tenant-admin-mutations | בידוד | POST לקהילה זרה לא מעדכן מסד |
| tenant-board-api-slug | בידוד | נתוני לוח לפי slug בלבד |
| admin-auth-enumerated | auth | כל route אדמין עם requireAdmin |
| master-auth-enumerated | auth | כל route מאסטר עם requireMaster |
| slug-unique-valid | נתונים | slug תקין וייחודי |
| timezone-per-community | לוח שנה | timezone לקהילה בחישובי יארצייט/Chumash |
| uploads-shared-dirs | אחסון | תמונות בנתיבי photos/images |
| saved-view-design-roundtrip | עיצוב | ייצוא/ייבוא עיצוב בלבד |
| hebrew-gregorian | לוח שנה | המרה עברית־לועזית |
| yahrzeit-after-sunset | לוח שנה | **פתוח** — `test.todo` (לא מיושם בקוד) |
| leap-adar | לוח שנה | שנים מעוברות ואדר ב׳ |
| i18n-keys | i18n | מפתחות he/ru/en |
| no-mojibake | קידוד | `test/no-mojibake.test.js` |

### Known gaps

- **yahrzeit-after-sunset**: אין עדיין התחשבות בשקיעה ב־`computeHebrewDateOfDeath` — מסומן `it.todo` ב־`test/invariants.test.js`.

---

## English summary

- Unit and HTTP tests live under `test/*.test.js` (Node built-in test runner).
- Mongo-dependent integration tests skip cleanly when MongoDB is unreachable.
- `release:check` must pass before merging (see `AGENTS.md`).
- Invariant IDs are stable in `test/invariants-manifest.js` for docs and CI.
