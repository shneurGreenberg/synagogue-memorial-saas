package com.synagogue.sidebar.widget;

import android.graphics.Color;

import java.util.Locale;

final class WidgetI18n {
    private static final int COLOR_ACCENT = Color.parseColor("#FFD54F");
    private static final int COLOR_OVERCAST = Color.parseColor("#CFD8DC");
    private static final int COLOR_FOG = Color.parseColor("#B0BEC5");
    private static final int COLOR_RAIN = Color.parseColor("#81D4FA");
    private static final int COLOR_SNOW = Color.parseColor("#E3F2FD");
    private static final int COLOR_TEXT = Color.parseColor("#F0F0F0");

    private WidgetI18n() {}

    static String shabbatEnter(String lang) {
        if ("he".equals(lang)) return "כניסת שבת";
        if ("en".equals(lang)) return "Shabbat enters";
        return "Вход в Шаббат";
    }

    static String shabbatExit(String lang) {
        if ("he".equals(lang)) return "יציאת שבת";
        if ("en".equals(lang)) return "Shabbat ends";
        return "Выход из Шаббата";
    }

    static String weeklyChapter(String lang) {
        if ("he".equals(lang)) return "פרשת השבוע";
        if ("en".equals(lang)) return "Weekly portion";
        return "Недельная глава";
    }

    static String upcomingTitle(String lang) {
        if ("he".equals(lang)) return "תאריכים והודעות קרובות";
        if ("en".equals(lang)) return "Upcoming dates & announcements";
        return "Ближайшие даты и объявления";
    }

    static String noAnnouncements(String lang) {
        if ("he".equals(lang)) return "אין הודעות כרגע";
        if ("en".equals(lang)) return "No announcements yet";
        return "Пока нет объявлений";
    }

    static String sunriseLabel(String lang) {
        if ("he".equals(lang)) return "זריחה";
        if ("en".equals(lang)) return "Sunrise";
        return "Восход";
    }

    static String sunsetLabel(String lang) {
        if ("he".equals(lang)) return "שקיעה";
        if ("en".equals(lang)) return "Sunset";
        return "Закат";
    }

    static String weatherIcon(int code) {
        if (code == 0 || code == 1) return "☀";
        if (code == 2) return "⛅";
        if (code == 3) return "☁";
        if (code <= 48) return "≈";
        if (code <= 67) return "☂";
        if (code <= 77) return "❄";
        if (code <= 82) return "☂";
        if (code >= 95) return "⚡";
        return "°";
    }

    /** Colors match board `.weather-icon-*` in styles/home.scss */
    static int weatherIconColor(int code) {
        if (code == 0 || code == 1 || code == 2) return COLOR_ACCENT;
        if (code == 3) return COLOR_OVERCAST;
        if (code <= 48) return COLOR_FOG;
        if (code <= 67) return COLOR_RAIN;
        if (code <= 77) return COLOR_SNOW;
        if (code <= 82) return COLOR_RAIN;
        if (code >= 95) return COLOR_ACCENT;
        return COLOR_TEXT;
    }

    static int weatherIconColor(String glyph) {
        if (glyph == null || glyph.isEmpty()) {
            return COLOR_ACCENT;
        }
        if (glyph.contains("☀") || glyph.contains("⛅") || glyph.contains("⚡")) {
            return COLOR_ACCENT;
        }
        if (glyph.contains("≈")) {
            return COLOR_FOG;
        }
        if (glyph.contains("☁")) {
            return COLOR_OVERCAST;
        }
        if (glyph.contains("☂")) {
            return COLOR_RAIN;
        }
        if (glyph.contains("❄")) {
            return COLOR_SNOW;
        }
        return COLOR_ACCENT;
    }

    static String weatherLabel(String lang, int code) {
        if ("he".equals(lang)) return weatherLabelHe(code);
        if ("en".equals(lang)) return weatherLabelEn(code);
        return weatherLabelRu(code);
    }

    static Locale gregorianLocale(String lang) {
        if ("he".equals(lang)) return new Locale("he", "IL");
        if ("en".equals(lang)) return Locale.US;
        return new Locale("ru", "RU");
    }

    static String hebrewMonth(String lang, String englishMonth) {
        if (englishMonth == null) {
            return "";
        }

        if ("he".equals(lang)) {
            return englishMonth;
        }

        if ("ru".equals(lang)) {
            switch (englishMonth) {
                case "Nisan": return "Нисана";
                case "Iyyar": return "Ияра";
                case "Sivan": return "Сивана";
                case "Tamuz": return "Тамуза";
                case "Av": return "Ава";
                case "Elul": return "Элула";
                case "Tishrei": return "Тишрея";
                case "Cheshvan": return "Хешвана";
                case "Kislev": return "Кислева";
                case "Tevet": return "Тевета";
                case "Sh'vat": return "Швата";
                case "Adar": return "Адара";
                case "Adar II": return "Адара II";
                default: return englishMonth;
            }
        }

        return englishMonth;
    }

    private static String weatherLabelHe(int code) {
        if (code == 0) return "בהיר";
        if (code <= 3) return "מעונן";
        if (code <= 48) return "ערפל";
        if (code <= 67) return "גשם";
        if (code <= 77) return "שלג";
        if (code <= 82) return "ממטרים";
        if (code >= 95) return "סופה";
        return "מזג אוויר";
    }

    private static String weatherLabelEn(int code) {
        if (code == 0) return "Clear";
        if (code <= 3) return "Cloudy";
        if (code <= 48) return "Fog";
        if (code <= 67) return "Rain";
        if (code <= 77) return "Snow";
        if (code <= 82) return "Showers";
        if (code >= 95) return "Storm";
        return "Weather";
    }

    private static String weatherLabelRu(int code) {
        if (code == 0) return "Ясно";
        if (code <= 3) return "Облачно";
        if (code <= 48) return "Туман";
        if (code <= 67) return "Дождь";
        if (code <= 77) return "Снег";
        if (code <= 82) return "Ливень";
        if (code >= 95) return "Гроза";
        return "Погода";
    }
}
