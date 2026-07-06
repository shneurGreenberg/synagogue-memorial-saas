package com.synagogue.sidebar.widget;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

final class WidgetAnnouncementsStore {
    private static final String KEY = "announcements_json";

    private WidgetAnnouncementsStore() {}

    static void save(Context context, String json) {
        if (json == null || json.trim().isEmpty()) {
            return;
        }
        WidgetPrefs.prefs(context).edit().putString(KEY, json).apply();
    }

    static List<WidgetAnnouncementItem> load(Context context) {
        String raw = WidgetPrefs.prefs(context).getString(KEY, "[]");
        List<WidgetAnnouncementItem> items = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                items.add(new WidgetAnnouncementItem(
                    item.optString("date", ""),
                    item.optString("title", ""),
                    item.optString("text", ""),
                    item.optString("type", "holiday")
                ));
            }
        } catch (Exception ignored) {
            // Keep empty list.
        }
        return items;
    }

    static String buildFromSidebarPayload(JSONObject json, String lang) {
        JSONArray result = new JSONArray();
        try {
            appendFromArray(result, json.optJSONArray("communityEvents"), lang, "event");
            appendFromArray(result, json.optJSONArray("upcomingHolidays"), lang, "holiday");
            appendFromArray(result, json.optJSONArray("chabadDates"), lang, "chabad");
        } catch (Exception ignored) {
            return "[]";
        }
        return result.toString();
    }

    private static void appendFromArray(JSONArray target, JSONArray source, String lang, String type) throws Exception {
        if (source == null) {
            return;
        }

        int limit = Math.min(source.length(), 12);
        for (int i = 0; i < limit; i++) {
            JSONObject item = source.getJSONObject(i);
            JSONObject entry = new JSONObject();
            entry.put("type", type);
            entry.put("title", item.optString("title", ""));
            entry.put("text", item.optString("text", ""));
            entry.put("date", formatDate(item.optString("date", ""), lang));
            target.put(entry);
        }
    }

    private static String formatDate(String isoDate, String lang) {
        if (isoDate == null || isoDate.isEmpty()) {
            return "";
        }

        try {
            SimpleDateFormat input = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date date = input.parse(isoDate);
            if (date == null) {
                return isoDate;
            }

            Locale locale = WidgetI18n.gregorianLocale(lang);
            SimpleDateFormat output = new SimpleDateFormat("d MMMM", locale);
            return output.format(date);
        } catch (Exception ignored) {
            return isoDate;
        }
    }
}
