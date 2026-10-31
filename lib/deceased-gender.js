/* 1.31.1: gender of a deceased record (male / female / unknown).
 * Inference order: explicit marker words (בן/בת, сын/дочь, son/daughter, ben/bat, ז"ל vs ע"ה is ignored),
 * Russian patronymic / surname endings, then first-name lists (Hebrew, Russian, English). */
'use strict';

const GENDERS = ['male', 'female', 'unknown'];

function normalizeGender(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (['male', 'm', 'ben', 'בן', 'זכר'].includes(v)) return 'male';
  if (['female', 'f', 'bat', 'בת', 'נקבה'].includes(v)) return 'female';
  return 'unknown';
}

const FEMALE_NAMES = new Set(('שרה רבקה רחל לאה חנה מרים אסתר דבורה רות יהודית צפורה ציפורה בתיה בתשבע שושנה פנינה גולדה '
  + 'פייגא פייגה פייגע חיה חי\' מלכה פרומה פרומט פריידא פריידה רייזל ריזל שיינדל שיינא שיינה בלומה ברכה גיטל גיטה '
  + 'דינה חוה חווה טובה יוכבד ליבא ליבה מינדל מינה נחמה עטל פעסל פעשא פרידה צירל ציפא רוחמה רייכל שפרה שפרינצא '
  + 'אלישבע אביגיל נעמי תמר יפה זלטה זלאטה גאלדה סימה סאשה ברכה בילא ביילא בלה אידה איטה איטא הדסה הניה זיסל זלדה '
  + 'חנה טויבה טייבל יענטא יענטל ליבע מאשה מניה פסיה פייגל קיילה קריינדל רבקה רייזא שולמית שלומית אורה אילנה '
  + 'сара сарра ревекка ривка рива рахиль рахель лея лия хана хая хася мирьям мирьям мириам мария эстер эсфирь эсфира '
  + 'дебора двойра двора рут руфь юдифь ципора циля бася бетя батья шошана роза голда фейга фаина фрума фрида фрейда '
  + 'рейзл раиса раиса шейна бluма блюма брайна гитл гита геня дина ева хава това тойба тауба малка мина '
  + 'нехама этель этля песя пеша ида ита соня софья софия анна мария ольга ирина елена татьяна наталья наталия '
  + 'людмила галина валентина нина любовь вера надежда евгения клара берта белла бэлла полина лидия зинаида тамара '
  + 'ася аня маня мира мэри эмма элла инна жанна лариса марина светлана юлия екатерина александра антонина '
  + 'зоя римма розалия цецилия цыля шифра эсфирь фира дора двора хана злата злота хьена шейндл неха '
  + 'sarah sara rebecca rivka rachel leah hannah chana chaya miriam esther devorah ruth judith tzipora batya '
  + 'shoshana golda fruma frida reizel sheina bluma gitel dina eva chava tova malka mina nechama etel pesia ida '
  + 'sofia anna maria olga irina elena tatiana natalia lyudmila galina valentina nina lubov vera nadezhda').split(/\s+/).filter(Boolean));

const MALE_NAMES = new Set(('אברהם יצחק יעקב משה אהרן אהרון דוד שלמה יוסף בנימין יהודה לוי שמעון ראובן נפתלי אשר גד זבולון '
  + 'יששכר דן שמואל אליהו אלימלך מנחם מענדל מנדל שניאור זלמן חיים מרדכי ישראל אריה לייב ליב צבי הירש הירשל ברוך '
  + 'בער דב זאב וולף פנחס נחום נחמן עזריאל אליעזר יהושע יונה יחיאל מאיר מיכאל נתן עמרם פרץ צדוק קלמן שאול שמחה '
  + 'שבתי שלום גרשון גדליה הלל זכריה חנוך חזקיהו טוביה יואל יחזקאל ירמיהו ישעיהו מתתיהו נח עזרא עקיבא פסח שמריהו '
  + 'אייזיק איצחק איצק אלטר אליה בצלאל בן ציון גבריאל דניאל הרשל וועלוול זיסקינד חונא חנה טודרוס יוסל יקותיאל '
  + 'ירחמיאל לוזר מוטל מאטל מושה נטע נסים סנדר עמנואל פייבל פישל קאפל רפאל שלמה שמעיה תנחום '
  + 'авраам абрам исаак ицхак яков яаков моисей моше мойше аарон арон давид соломон шломо иосиф йосеф иосиф '
  + 'вениамин беньямин иуда лейб лев семен семён шимон рувим нафтали ашер самуил шмуэль илья элияху эли менахем мендель '
  + 'залман хаим мордехай мордух израиль исраэль арье цви гирш борух барух берл бер дов зеев вольф велвл пинхас '
  + 'наум нахман эльазар лазарь иегошуа иона мейер меер михаил натан нохим шауль симха шолом шлема гершон гедалья '
  + 'гилель захар хоне хонон тевье иоиль иезекииль пейсах ефим ефрем евсей зиновий григорий борис владимир виктор '
  + 'александр сергей николай алексей анатолий андрей аркадий геннадий георгий дмитрий евгений игорь иван '
  + 'константин леонид марк матвей петр пётр павел роман савелий станислав юрий яков вадим валерий василий '
  + 'вячеслав олег эдуард эммануил эмиль фёдор федор фридрих генрих герман гарри исак исай иосиф кальман копель '
  + 'мендл мотл моисей мотель нисон нисан перец рафаил рафаэль самсон самуил сендер тимофей филипп шая шмуль эфраим '
  + 'юда юлий яким моник арнольд монус зяма зиновий абрам лазарь ефим изя изяслав фроим янкель хаскель '
  + 'abraham avraham isaac yitzchak jacob yaakov moshe moses aaron david solomon shlomo joseph yosef benjamin '
  + 'yehuda levi shimon reuven naftali asher samuel shmuel eliyahu menachem mendel shneur zalman chaim mordechai '
  + 'israel yisrael aryeh leib tzvi hirsch baruch dov zev wolf pinchas nachum nachman eliezer yehoshua yona meir '
  + 'michael natan nathan shaul simcha sholom gershon boris vladimir victor alexander sergey mikhail').split(/\s+/).filter(Boolean));

function words(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[()[\],.;:!?\-–—\/]/g, ' ')
    .replace(/["״׳'`]/g, (c) => (c === "'" || c === '׳' ? "'" : '"'))
    .split(/\s+/)
    .filter(Boolean);
}

function inferGenderFromName(name) {
  const w = words(name);
  if (!w.length) return 'unknown';
  // 1. Marker words ("X son of Y" / "X בן Y").
  for (const t of w) {
    if (['בת', 'дочь', 'daughter', 'bat', 'бат'].includes(t)) return 'female';
    if (['בן', 'сын', 'son', 'ben', 'бен'].includes(t)) return 'male';
  }
  // 2. Russian patronymic.
  for (const t of w) {
    if (/^[а-яё]{3,}(овна|евна|ична|инична)$/.test(t)) return 'female';
    if (/^[а-яё]{3,}(ович|евич|ьич|ич)$/.test(t)) return 'male';
  }
  // 3. First-name lists (any word; surnames rarely collide with these lists).
  let m = 0; let f = 0;
  for (const t of w) {
    if (MALE_NAMES.has(t)) m += 1;
    if (FEMALE_NAMES.has(t)) f += 1;
  }
  if (m && !f) return 'male';
  if (f && !m) return 'female';
  // 4. Russian surname endings (Иванова / Иванов, Каплинская / Каплинский).
  for (const t of w) {
    if (/^[а-яё]{3,}(ова|ева|ина|ына|ская|цкая)$/.test(t)) return 'female';
    if (/^[а-яё]{3,}(ов|ев|ин|ын|ский|цкий)$/.test(t)) return 'male';
  }
  return 'unknown';
}

function inferPersonGender(person) {
  const g = String((person && person.gender) || '').toLowerCase();
  if (g === 'male' || g === 'female') return g;
  const fromName = inferGenderFromName(person && person.name);
  if (fromName !== 'unknown') return fromName;
  return inferGenderFromName(person && person.title);
}

/** Idempotent: fills only records whose gender is not male/female. Returns per-record updates. */
function planGenderMigration(people) {
  const updates = [];
  (people || []).forEach((p, index) => {
    const cur = String((p && p.gender) || '');
    if (cur === 'male' || cur === 'female') return;
    const next = inferPersonGender({ ...p, gender: '' });
    if (cur !== next) updates.push({ index, id: p.id, _id: p._id, gender: next });
  });
  return updates;
}

function countGenders(people) {
  const out = { male: 0, female: 0, missing: 0 };
  (people || []).forEach((p) => {
    const g = String((p && p.gender) || '');
    if (g === 'male') out.male += 1; else if (g === 'female') out.female += 1; else out.missing += 1;
  });
  return out;
}

module.exports = { GENDERS, normalizeGender, inferGenderFromName, inferPersonGender, planGenderMigration, countGenders };
