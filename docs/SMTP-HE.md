# הגדרת מייל לתזכורות יום שנה

תזכורות יום השנה נשלחות דרך **SMTP** — זה שירות שליחת מיילים רגיל (כמו Outlook או Gmail).

## שלב 1 — הוסיפו לקובץ `.env`

בשורש הפרויקט, בתוך `.env`, הוסיפו:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-login@example.com
SMTP_PASS=your-password-or-app-password
SMTP_FROM=reminders@your-domain.com
```

| משתנה | מה זה |
|--------|--------|
| `SMTP_HOST` | כתובת שרת המייל של הספק |
| `SMTP_PORT` | בדרך כלל `587` (או `465` ל-SSL) |
| `SMTP_USER` | שם משתמש להתחברות |
| `SMTP_PASS` | סיסמה או "App Password" |
| `SMTP_FROM` | כתובת השולח — מה שהמנהל יראה ב"מאת" |

**חובה:** `SMTP_HOST` ו-`SMTP_FROM`. בלי שניהם האזהרה בפאנל תישאר.

## שלב 2 — בדיקה

```bash
node scripts/test-smtp.js your-email@example.com
```

אם הגיע מייל — ההגדרה תקינה.

## שלב 3 — הפעלה בפאנל הניהול

1. **הגדרות** → **תזכורות יום שנה**
2. סמנו **שלח תזכורות יומיות במייל**
3. הזינו את **כתובת המייל של המנהל/מזכירה**
4. שמרו

## שלב 4 — שליחה אוטומטית כל בוקר

הריצו פעם ביום (cron):

```bash
npm run yahrzeit-reminders
```

דוגמה ל-cron (כל יום ב-07:00):

```cron
0 7 * * * cd /path/to/synagogue && npm run yahrzeit-reminders
```

---

## דוגמאות לפי ספק

### Gmail

1. הפעילו [אימות דו-שלבי](https://myaccount.google.com/security)
2. צרו [App Password](https://myaccount.google.com/apppasswords)
3. ב-`.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=you@gmail.com
```

### Outlook / Hotmail / Microsoft 365

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=you@outlook.com
SMTP_PASS=your-password
SMTP_FROM=you@outlook.com
```

### SendGrid (מומלץ ל-production)

1. חשבון ב-[SendGrid](https://sendgrid.com)
2. API Key + אימות דומיין/כתובת שולח

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key
SMTP_FROM=verified@your-synagogue.org
```

### Yandex

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=you@yandex.ru
SMTP_PASS=your-password
SMTP_FROM=you@yandex.ru
```

---

## פתרון בעיות

| בעיה | מה לבדוק |
|------|-----------|
| האזהרה בפאנל לא נעלמת | `SMTP_HOST` ו-`SMTP_FROM` ב-`.env`, ואז **הפעלה מחדש** של `node app.js` |
| `Authentication failed` | סיסמה שגויה — ב-Gmail צריך App Password, לא סיסמה רגילה |
| המייל לא מגיע | בדקו Spam; ודאו ש-`SMTP_FROM` תואם לחשבון המאומת |
| `Connection timeout` | פורט חסום — נסו `465` עם `SMTP_PORT=465` |

---

## הערה על וואטסאפ

תזכורות **וואטסאפ** לא נשלחות אוטומטית מהשרת. בעמוד **ימי שנה היום** יש כפתור לפתיחת וואטסאפ עם הודעה מוכנה — המזכירה שולחת ידנית.
