package com.synagogue.sidebar.widget;

import android.content.Context;
import android.content.SharedPreferences;

public final class WidgetPrefs {
    private static final String PREFS = "sidebar_widget_prefs";

    private WidgetPrefs() {}

    public static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void saveSnapshot(
        Context context,
        String serverUrl,
        String slug,
        String language,
        double lat,
        double lng,
        String timezone,
        String announcement
    ) {
        SharedPreferences prefs = prefs(context);
        String previousLanguage = prefs.getString("language", "ru");
        SharedPreferences.Editor editor = prefs.edit()
            .putString("server_url", serverUrl == null ? "" : serverUrl)
            .putString("slug", slug == null ? "" : slug)
            .putString("language", language == null ? "ru" : language)
            .putFloat("lat", (float) lat)
            .putFloat("lng", (float) lng)
            .putString("timezone", timezone == null ? "UTC" : timezone);

        if (announcement != null && !announcement.trim().isEmpty()) {
            editor.putString("announcement", announcement);
        }

        if (!previousLanguage.equals(language == null ? "ru" : language)) {
            clearLastGood(context);
        }

        editor.apply();
    }

    public static void saveLastGood(Context context, WidgetData data, String language) {
        if (data == null) {
            return;
        }

        String lang = language == null ? "ru" : language;
        WidgetData previous = loadLastGood(context, lang);
        WidgetData merged = mergeKeepNonEmpty(previous, data);

        prefs(context).edit()
            .putString(lastKey("clock", lang), merged.clock)
            .putString(lastKey("hebrew_date", lang), merged.hebrewDate)
            .putString(lastKey("gregorian_date", lang), merged.gregorianDate)
            .putString(lastKey("parsha", lang), merged.parsha)
            .putString(lastKey("shabbat_enter", lang), merged.shabbatEnter)
            .putString(lastKey("shabbat_exit", lang), merged.shabbatExit)
            .putString(lastKey("weather", lang), merged.weather)
            .putString(lastKey("announcement", lang), merged.announcement)
            .putString("last_language", lang)
            .apply();
    }

    public static WidgetData loadLastGood(Context context, String language) {
        String lang = language == null ? "ru" : language;
        android.content.SharedPreferences prefs = prefs(context);
        WidgetData data = new WidgetData();
        data.clock = prefs.getString(lastKey("clock", lang), prefs.getString("last_clock", "--:--"));
        data.hebrewDate = prefs.getString(lastKey("hebrew_date", lang), prefs.getString("last_hebrew_date", ""));
        data.gregorianDate = prefs.getString(lastKey("gregorian_date", lang), prefs.getString("last_gregorian_date", ""));
        data.parsha = prefs.getString(lastKey("parsha", lang), prefs.getString("last_parsha", ""));
        data.shabbatEnter = prefs.getString(lastKey("shabbat_enter", lang), prefs.getString("last_shabbat_enter", ""));
        data.shabbatExit = prefs.getString(lastKey("shabbat_exit", lang), prefs.getString("last_shabbat_exit", ""));
        data.weather = prefs.getString(lastKey("weather", lang), prefs.getString("last_weather", ""));
        data.announcement = prefs.getString(lastKey("announcement", lang), prefs.getString("last_announcement", ""));
        return data;
    }

    public static void clearLastGood(Context context) {
        SharedPreferences prefs = prefs(context);
        SharedPreferences.Editor editor = prefs.edit();
        for (String lang : new String[] { "ru", "en", "he" }) {
            editor.remove(lastKey("clock", lang));
            editor.remove(lastKey("hebrew_date", lang));
            editor.remove(lastKey("gregorian_date", lang));
            editor.remove(lastKey("parsha", lang));
            editor.remove(lastKey("shabbat_enter", lang));
            editor.remove(lastKey("shabbat_exit", lang));
            editor.remove(lastKey("weather", lang));
            editor.remove(lastKey("announcement", lang));
        }
        editor.remove("last_clock");
        editor.remove("last_hebrew_date");
        editor.remove("last_gregorian_date");
        editor.remove("last_parsha");
        editor.remove("last_shabbat_enter");
        editor.remove("last_shabbat_exit");
        editor.remove("last_weather");
        editor.remove("last_announcement");
        editor.apply();
    }

    private static String lastKey(String field, String language) {
        return "last_" + field + "_" + language;
    }

    private static WidgetData mergeKeepNonEmpty(WidgetData previous, WidgetData next) {
        WidgetData merged = new WidgetData();
        merged.clock = pick(next.clock, previous.clock, "--:--");
        merged.hebrewDate = pick(next.hebrewDate, previous.hebrewDate, "");
        merged.gregorianDate = pick(next.gregorianDate, previous.gregorianDate, "");
        merged.parsha = pick(next.parsha, previous.parsha, "");
        merged.shabbatEnter = pick(next.shabbatEnter, previous.shabbatEnter, "");
        merged.shabbatExit = pick(next.shabbatExit, previous.shabbatExit, "");
        merged.weather = pick(next.weather, previous.weather, "");
        merged.announcement = pick(next.announcement, previous.announcement, "");
        return merged;
    }

    private static String pick(String preferred, String fallback, String defaultValue) {
        if (preferred != null && !preferred.trim().isEmpty()) {
            return preferred;
        }
        if (fallback != null && !fallback.trim().isEmpty()) {
            return fallback;
        }
        return defaultValue;
    }
}
