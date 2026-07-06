package com.synagogue.sidebar.widget;

import android.content.Context;

import org.json.JSONObject;

final class WidgetWeatherStore {
    private static final String KEY = "weather_json";

    private WidgetWeatherStore() {}

    static void save(Context context, String json) {
        if (json == null || json.trim().isEmpty()) {
            return;
        }
        WidgetPrefs.prefs(context).edit().putString(KEY, json).apply();
    }

    static void applyTo(Context context, WidgetData data) {
        if (data == null) {
            return;
        }

        String raw = WidgetPrefs.prefs(context).getString(KEY, "");
        if (raw == null || raw.isEmpty()) {
            return;
        }

        try {
            JSONObject json = new JSONObject(raw);
            putIfPresent(data, "weatherTemp", json.optString("weatherTemp", ""));
            putIfPresent(data, "weatherIcon", json.optString("weatherIcon", ""));
            putIfPresent(data, "weatherLabel", json.optString("weatherLabel", ""));
            putIfPresent(data, "sunriseText", json.optString("sunriseText", ""));
            putIfPresent(data, "sunsetText", json.optString("sunsetText", ""));
            putIfPresent(data, "forecast1Date", json.optString("forecast1Date", ""));
            putIfPresent(data, "forecast1Icon", json.optString("forecast1Icon", ""));
            putIfPresent(data, "forecast1Temps", json.optString("forecast1Temps", ""));
            putIfPresent(data, "forecast2Date", json.optString("forecast2Date", ""));
            putIfPresent(data, "forecast2Icon", json.optString("forecast2Icon", ""));
            putIfPresent(data, "forecast2Temps", json.optString("forecast2Temps", ""));
            putIfPresent(data, "forecast3Date", json.optString("forecast3Date", ""));
            putIfPresent(data, "forecast3Icon", json.optString("forecast3Icon", ""));
            putIfPresent(data, "forecast3Temps", json.optString("forecast3Temps", ""));
        } catch (Exception ignored) {
            // Keep existing weather values.
        }
    }

    private static void putIfPresent(WidgetData data, String field, String value) {
        if (value == null || value.trim().isEmpty()) {
            return;
        }

        switch (field) {
            case "weatherTemp":
                data.weatherTemp = value;
                break;
            case "weatherIcon":
                data.weatherIcon = value;
                break;
            case "weatherLabel":
                data.weatherLabel = value;
                break;
            case "sunriseText":
                data.sunriseText = value;
                break;
            case "sunsetText":
                data.sunsetText = value;
                break;
            case "forecast1Date":
                data.forecast1Date = value;
                break;
            case "forecast1Icon":
                data.forecast1Icon = value;
                break;
            case "forecast1Temps":
                data.forecast1Temps = value;
                break;
            case "forecast2Date":
                data.forecast2Date = value;
                break;
            case "forecast2Icon":
                data.forecast2Icon = value;
                break;
            case "forecast2Temps":
                data.forecast2Temps = value;
                break;
            case "forecast3Date":
                data.forecast3Date = value;
                break;
            case "forecast3Icon":
                data.forecast3Icon = value;
                break;
            case "forecast3Temps":
                data.forecast3Temps = value;
                break;
            default:
                break;
        }
    }
}
