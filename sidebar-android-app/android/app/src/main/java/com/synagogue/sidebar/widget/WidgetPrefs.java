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
        prefs(context).edit()
            .putString("server_url", serverUrl == null ? "" : serverUrl)
            .putString("slug", slug == null ? "" : slug)
            .putString("language", language == null ? "ru" : language)
            .putFloat("lat", (float) lat)
            .putFloat("lng", (float) lng)
            .putString("timezone", timezone == null ? "UTC" : timezone)
            .putString("announcement", announcement == null ? "" : announcement)
            .apply();
    }

    public static void saveLastGood(Context context, WidgetData data) {
        if (data == null) {
            return;
        }

        prefs(context).edit()
            .putString("last_clock", data.clock)
            .putString("last_hebrew_date", data.hebrewDate)
            .putString("last_gregorian_date", data.gregorianDate)
            .putString("last_parsha", data.parsha)
            .putString("last_shabbat_enter", data.shabbatEnter)
            .putString("last_shabbat_exit", data.shabbatExit)
            .putString("last_weather", data.weather)
            .putString("last_announcement", data.announcement)
            .apply();
    }

    public static WidgetData loadLastGood(Context context) {
        android.content.SharedPreferences prefs = prefs(context);
        WidgetData data = new WidgetData();
        data.clock = prefs.getString("last_clock", "--:--");
        data.hebrewDate = prefs.getString("last_hebrew_date", "");
        data.gregorianDate = prefs.getString("last_gregorian_date", "");
        data.parsha = prefs.getString("last_parsha", "");
        data.shabbatEnter = prefs.getString("last_shabbat_enter", "");
        data.shabbatExit = prefs.getString("last_shabbat_exit", "");
        data.weather = prefs.getString("last_weather", "");
        data.announcement = prefs.getString("last_announcement", "");
        return data;
    }
}
