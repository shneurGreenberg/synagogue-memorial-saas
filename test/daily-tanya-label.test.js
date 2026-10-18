const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatTanyaRef,
  isDateOnlyLabel,
  resolveDailyTanyaLabel,
} = require('../lib/daily-tanya-label');
const { gematriaDay } = require('../lib/hebrew-date-format');

const SAMPLE_SEFARIA = {
  title: { en: 'Tanya Yomi' },
  displayValue: { en: '7 Cheshvan', he: 'ז חשון' },
  ref: 'Tanya, Part IV; Iggeret HaKodesh 26:20',
};

describe('daily-tanya-label', () => {
  describe('formatTanyaRef', () => {
    const cases = [
      {
        ref: 'Tanya, Part I; Likkutei Amarim 12:3',
        en: 'Likkutei Amarim, ch. 12',
        he: `ליקוטי אמרים, פרק ${gematriaDay(12)}`,
        ru: 'Ликутей Амарим, гл. 12',
      },
      {
        ref: "Tanya, Part II; Sha'ar HaYichud VehaEmunah 8:4",
        en: "Sha'ar HaYichud VehaEmunah, ch. 8",
        he: `שער היחוד והאמונה, פרק ${gematriaDay(8)}`,
        ru: 'Шаар ха-Йихуд ве-ха-Эмуна, гл. 8',
      },
      {
        ref: 'Tanya, Part II; Shaar HaYichud VehaEmunah 1:1',
        en: "Sha'ar HaYichud VehaEmunah, ch. 1",
        ru: 'Шаар ха-Йихуд ве-ха-Эмуна, гл. 1',
      },
      {
        ref: 'Tanya, Part III; Iggeret HaTeshuvah 3:15',
        en: 'Iggeret HaTeshuvah, ch. 3',
        he: `אגרת התשובה, פרק ${gematriaDay(3)}`,
        ru: 'Игерет а-Тешува, гл. 3',
      },
      {
        ref: 'Tanya, Part IV; Iggeret HaKodesh 26:20',
        en: 'Iggeret HaKodesh, ch. 26',
        he: `אגרת הקודש, פרק ${gematriaDay(26)}`,
        ru: 'Игерет а-Кодеш, гл. 26',
      },
      {
        ref: 'Tanya, Part V; Kuntres Acharon 5:2',
        en: 'Kuntres Acharon, ch. 5',
        he: `קונטרס אחרון, פרק ${gematriaDay(5)}`,
        ru: 'Кунтрес Ахарон, гл. 5',
      },
    ];

    for (const row of cases) {
      it(`formats ${row.ref} for en`, () => {
        assert.equal(formatTanyaRef(row.ref, 'en'), row.en);
      });
      if (row.he) {
        it(`formats ${row.ref} for he`, () => {
          assert.equal(formatTanyaRef(row.ref, 'he'), row.he);
        });
      }
      if (row.ru) {
        it(`formats ${row.ref} for ru`, () => {
          assert.equal(formatTanyaRef(row.ref, 'ru'), row.ru);
        });
      }
    }

    it('returns cleaned ref for unknown section without throwing', () => {
      const unknown = 'Tanya, Part IX; Mystery Section 9:1';
      const formatted = formatTanyaRef(unknown, 'en');
      assert.ok(formatted.includes('Mystery Section'));
      assert.ok(formatted.includes('ch. 9'));
    });

    it('handles empty ref', () => {
      assert.equal(formatTanyaRef('', 'en'), '');
      assert.equal(formatTanyaRef(null, 'ru'), '');
    });
  });

  describe('isDateOnlyLabel', () => {
    it('detects English date-only labels', () => {
      assert.equal(isDateOnlyLabel('7 Cheshvan'), true);
      assert.equal(isDateOnlyLabel('Cheshvan 7'), true);
      assert.equal(isDateOnlyLabel('Iggeret HaKodesh, ch. 26'), false);
    });

    it('detects Hebrew date-only labels', () => {
      assert.equal(isDateOnlyLabel('ז חשון'), true);
      assert.equal(isDateOnlyLabel(`אגרת הקודש, פרק ${gematriaDay(26)}`), false);
    });

    it('detects Russian date-only labels', () => {
      assert.equal(isDateOnlyLabel('7 Хешван'), true);
      assert.equal(isDateOnlyLabel('Игерет а-Кодеш, гл. 26'), false);
    });
  });

  describe('resolveDailyTanyaLabel', () => {
    it('uses Sefaria ref instead of displayValue date', () => {
      assert.equal(
        resolveDailyTanyaLabel({ sefariaItem: SAMPLE_SEFARIA, lang: 'en' }),
        'Iggeret HaKodesh, ch. 26',
      );
      assert.notEqual(
        resolveDailyTanyaLabel({ sefariaItem: SAMPLE_SEFARIA, lang: 'en' }),
        '7 Cheshvan',
      );
    });

    it('localizes from Sefaria ref for he and ru', () => {
      assert.equal(
        resolveDailyTanyaLabel({ sefariaItem: SAMPLE_SEFARIA, lang: 'he' }),
        `אגרת הקודש, פרק ${gematriaDay(26)}`,
      );
      assert.equal(
        resolveDailyTanyaLabel({ sefariaItem: SAMPLE_SEFARIA, lang: 'ru' }),
        'Игерет а-Кодеш, гл. 26',
      );
    });

    it('falls back to lessons5786 when ref missing', () => {
      assert.equal(
        resolveDailyTanyaLabel({
          lessons5786Tanya: 'Tanya, Likkutei Amarim, ch. 2',
          lang: 'en',
        }),
        'Tanya, Likkutei Amarim, ch. 2',
      );
    });

    it('falls back to hayom yom when earlier sources missing or date-only', () => {
      assert.equal(
        resolveDailyTanyaLabel({
          sefariaItem: { displayValue: { en: '7 Cheshvan' } },
          lessons5786Tanya: '7 Cheshvan',
          hayomYomTanyaLabel: 'Iggeret HaKodesh 26',
          lang: 'en',
        }),
        'Iggeret HaKodesh 26',
      );
    });

    it('returns empty for missing input', () => {
      assert.equal(resolveDailyTanyaLabel({ lang: 'en' }), '');
      assert.equal(
        resolveDailyTanyaLabel({
          sefariaItem: { displayValue: { en: '7 Cheshvan' } },
          lessons5786Tanya: 'ז חשון',
          lang: 'he',
        }),
        '',
      );
    });
  });
});
