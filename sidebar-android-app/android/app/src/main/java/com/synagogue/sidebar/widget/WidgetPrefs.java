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
}
