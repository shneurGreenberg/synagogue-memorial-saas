# API ציבורי לנפטרים — שימוש באתר נפרד

אפשר לקרוא מאתר אחר את כל שמות הנפטרים, התמונות, התאריכים והטקסט הציבורי של בית הכנסת.

ה־API **לא** מחזיר פרטי קשר, סיסמאות, מנהלים או שדות פנימיים אחרים.

## כתובות

החליפו `YOUR-DOMAIN` בכתובת האתר של לוח הזיכרון, ו־`SLUG` בשם בית הכנסת (למשל `novosibirsk`).

| מה לקבל | כתובת |
|---------|--------|
| כל הנפטרים (JSON) | `https://YOUR-DOMAIN/s/SLUG/api/people` |
| אדם אחד | `https://YOUR-DOMAIN/s/SLUG/api/people/ID` |
| הורדת קובץ JSON | `https://YOUR-DOMAIN/s/SLUG/api/people?download=1` |

דוגמה מקומית:

```
http://localhost:3000/s/novosibirsk/api/people
```

CORS פתוח ל־`GET` מכל אתר (`Access-Control-Allow-Origin: *`), כולל תמונות ב־`/photos/...`.

## שדות בכל נפטר

```json
{
  "id": 14,
  "name": "שם הנפטר",
  "title": "כותרת קצרה ליום היארצייט",
  "text": "<p>טקסט זיכרון ב-HTML</p>",
  "gregorianDateOfDeath": { "year": 1950, "month": 1, "date": 6 },
  "hebrewDateOfDeath": { "year": 5710, "month": 10, "date": 17, "label": "17 טבת" },
  "photo": "14.jpg",
  "photoUrl": "https://YOUR-DOMAIN/photos/14.jpg",
  "photoThumbUrl": "https://YOUR-DOMAIN/photos/14.jpg?w=256",
  "photoCrop": { "x": 50, "y": 50, "zoom": 1 },
  "cardUrl": "https://YOUR-DOMAIN/s/SLUG/card/14"
}
```

- `photoUrl` — תמונה מלאה. אפשר לשים ישירות ב־`<img src="...">`.
- `photoThumbUrl` — תמונה מוקטנת לרשימות.
- `text` — HTML שמור במערכת. **אל תדביקו אותו ל־`innerHTML` בלי סינון** אם האתר שלכם חשוף למשתמשים.
- `hebrewDateOfDeath.month` — חודש עברי לפי Hebcal (`1` = ניסן … `13` = אדר ב).

## דוגמה לאתר נפרד

שימו את הקוד הבא בעמוד באתר האחר (JavaScript רגיל, בלי ספריות):

```html
<div id="memorial-people"></div>
<script>
  const API = 'https://YOUR-DOMAIN/s/novosibirsk/api/people';

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch(API)
    .then((res) => {
      if (!res.ok) throw new Error('People API failed');
      return res.json();
    })
    .then(({ people }) => {
      const root = document.getElementById('memorial-people');
      root.innerHTML = people.map((person) => {
        const photo = person.photoThumbUrl
          ? `<img src="${escapeHtml(person.photoThumbUrl)}" alt="${escapeHtml(person.name)}" width="96" height="96">`
          : '';
        const hebrew = person.hebrewDateOfDeath && person.hebrewDateOfDeath.label
          ? escapeHtml(person.hebrewDateOfDeath.label)
          : '';
        const gregorian = person.gregorianDateOfDeath
          ? `${person.gregorianDateOfDeath.date}/${person.gregorianDateOfDeath.month}/${person.gregorianDateOfDeath.year}`
          : '';
        return `
          <article>
            ${photo}
            <h2>${escapeHtml(person.name)}</h2>
            <p>${hebrew}${hebrew && gregorian ? ' · ' : ''}${escapeHtml(gregorian)}</p>
          </article>
        `;
      }).join('');
    })
    .catch((err) => {
      console.error(err);
    });
</script>
```

בשרת (Node.js):

```js
const res = await fetch('https://YOUR-DOMAIN/s/novosibirsk/api/people');
const data = await res.json();
console.log(data.people.map((person) => person.name));
```

## מגבלות

- עד 120 בקשות לדקה לכל כתובת (rate limit).
- אם הנתונים כמעט לא משתנים, אפשר לשמור cache ל־5 דקות (`Cache-Control: max-age=300`).
- לוח הזיכרון עצמו נשאר ב־`/s/SLUG`. ה־API הזה מיועד רק לקריאה מאתר אחר.
