package com.synagogue.sidebar.widget;

import java.util.Locale;

final class WidgetI18n {
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
