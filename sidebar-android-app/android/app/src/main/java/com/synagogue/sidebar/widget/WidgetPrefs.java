package com.synagogue.sidebar.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

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
        String announcementsJson,
        String weatherJson
    ) {
        SharedPreferences store = prefs(context);
        String previousLanguage = store.getString("language", "ru");
        SharedPreferences.Editor editor = store.edit()
            .putString("server_url", serverUrl == null ? "" : serverUrl)
            .putString("slug", slug == null ? "" : slug)
            .putString("language", language == null ? "ru" : language)
            .putFloat("lat", (float) lat)
            .putFloat("lng", (float) lng)
            .putString("timezone", timezone == null ? "UTC" : timezone);

        if (announcementsJson != null && !announcementsJson.trim().isEmpty()) {
            WidgetAnnouncementsStore.save(context, announcementsJson);
        }

        if (weatherJson != null && !weatherJson.trim().isEmpty()) {
            WidgetWeatherStore.save(context, weatherJson);
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
            .putString(widgetDataKey(lang), toJson(merged).toString())
            .apply();
    }

    public static WidgetData loadLastGood(Context context, String language) {
        String lang = language == null ? "ru" : language;
        String raw = prefs(context).getString(widgetDataKey(lang), "");
        if (raw == null || raw.isEmpty()) {
            return new WidgetData();
        }

        try {
            return fromJson(new JSONObject(raw));
        } catch (Exception ignored) {
            return new WidgetData();
        }
    }

    public static void clearLastGood(Context context) {
        SharedPreferences.Editor editor = prefs(context).edit();
        for (String lang : new String[] { "ru", "en", "he" }) {
            editor.remove(widgetDataKey(lang));
        }
        editor.apply();
    }

    private static String widgetDataKey(String language) {
        return "widget_data_" + language;
    }

    private static WidgetData mergeKeepNonEmpty(WidgetData previous, WidgetData next) {
        WidgetData merged = new WidgetData();
        merged.clock = pick(next.clock, previous.clock, "--:--");
        merged.hebrewDate = pick(next.hebrewDate, previous.hebrewDate, "");
        merged.gregorianDate = pick(next.gregorianDate, previous.gregorianDate, "");
        merged.parshaHeading = pick(next.parshaHeading, previous.parshaHeading, "");
        merged.parshaName = pick(next.parshaName, previous.parshaName, "");
        merged.shabbatEnterLabel = pick(next.shabbatEnterLabel, previous.shabbatEnterLabel, "");
        merged.shabbatEnterTime = pick(next.shabbatEnterTime, previous.shabbatEnterTime, "");
        merged.shabbatExitLabel = pick(next.shabbatExitLabel, previous.shabbatExitLabel, "");
        merged.shabbatExitTime = pick(next.shabbatExitTime, previous.shabbatExitTime, "");
        merged.weatherTemp = pick(next.weatherTemp, previous.weatherTemp, "");
        merged.weatherIcon = pick(next.weatherIcon, previous.weatherIcon, "");
        merged.weatherLabel = pick(next.weatherLabel, previous.weatherLabel, "");
        merged.sunriseText = pick(next.sunriseText, previous.sunriseText, "");
        merged.sunsetText = pick(next.sunsetText, previous.sunsetText, "");
        merged.forecast1Date = pick(next.forecast1Date, previous.forecast1Date, "");
        merged.forecast1Icon = pick(next.forecast1Icon, previous.forecast1Icon, "");
        merged.forecast1Temps = pick(next.forecast1Temps, previous.forecast1Temps, "");
        merged.forecast2Date = pick(next.forecast2Date, previous.forecast2Date, "");
        merged.forecast2Icon = pick(next.forecast2Icon, previous.forecast2Icon, "");
        merged.forecast2Temps = pick(next.forecast2Temps, previous.forecast2Temps, "");
        merged.forecast3Date = pick(next.forecast3Date, previous.forecast3Date, "");
        merged.forecast3Icon = pick(next.forecast3Icon, previous.forecast3Icon, "");
        merged.forecast3Temps = pick(next.forecast3Temps, previous.forecast3Temps, "");
        merged.announcementsTitle = pick(next.announcementsTitle, previous.announcementsTitle, "");
        return merged;
    }

    private static JSONObject toJson(WidgetData data) {
        JSONObject json = new JSONObject();
        try {
            json.put("clock", data.clock);
            json.put("hebrewDate", data.hebrewDate);
            json.put("gregorianDate", data.gregorianDate);
            json.put("parshaHeading", data.parshaHeading);
            json.put("parshaName", data.parshaName);
            json.put("shabbatEnterLabel", data.shabbatEnterLabel);
            json.put("shabbatEnterTime", data.shabbatEnterTime);
            json.put("shabbatExitLabel", data.shabbatExitLabel);
            json.put("shabbatExitTime", data.shabbatExitTime);
            json.put("weatherTemp", data.weatherTemp);
            json.put("weatherIcon", data.weatherIcon);
            json.put("weatherLabel", data.weatherLabel);
            json.put("sunriseText", data.sunriseText);
            json.put("sunsetText", data.sunsetText);
            json.put("forecast1Date", data.forecast1Date);
            json.put("forecast1Icon", data.forecast1Icon);
            json.put("forecast1Temps", data.forecast1Temps);
            json.put("forecast2Date", data.forecast2Date);
            json.put("forecast2Icon", data.forecast2Icon);
            json.put("forecast2Temps", data.forecast2Temps);
            json.put("forecast3Date", data.forecast3Date);
            json.put("forecast3Icon", data.forecast3Icon);
            json.put("forecast3Temps", data.forecast3Temps);
            json.put("announcementsTitle", data.announcementsTitle);
        } catch (Exception ignored) {
            // Return partial JSON.
        }
        return json;
    }

    private static WidgetData fromJson(JSONObject json) {
        WidgetData data = new WidgetData();
        data.clock = json.optString("clock", "--:--");
        data.hebrewDate = json.optString("hebrewDate", "");
        data.gregorianDate = json.optString("gregorianDate", "");
        data.parshaHeading = json.optString("parshaHeading", "");
        data.parshaName = json.optString("parshaName", "");
        data.shabbatEnterLabel = json.optString("shabbatEnterLabel", "");
        data.shabbatEnterTime = json.optString("shabbatEnterTime", "");
        data.shabbatExitLabel = json.optString("shabbatExitLabel", "");
        data.shabbatExitTime = json.optString("shabbatExitTime", "");
        data.weatherTemp = json.optString("weatherTemp", "");
        data.weatherIcon = json.optString("weatherIcon", "");
        data.weatherLabel = json.optString("weatherLabel", "");
        data.sunriseText = json.optString("sunriseText", "");
        data.sunsetText = json.optString("sunsetText", "");
        data.forecast1Date = json.optString("forecast1Date", "");
        data.forecast1Icon = json.optString("forecast1Icon", "");
        data.forecast1Temps = json.optString("forecast1Temps", "");
        data.forecast2Date = json.optString("forecast2Date", "");
        data.forecast2Icon = json.optString("forecast2Icon", "");
        data.forecast2Temps = json.optString("forecast2Temps", "");
        data.forecast3Date = json.optString("forecast3Date", "");
        data.forecast3Icon = json.optString("forecast3Icon", "");
        data.forecast3Temps = json.optString("forecast3Temps", "");
        data.announcementsTitle = json.optString("announcementsTitle", "");
        return data;
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
