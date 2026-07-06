package com.synagogue.sidebar.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.synagogue.sidebar.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class WidgetDataLoader {
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private WidgetDataLoader() {}

    public static void updateAllWidgets(Context context) {
        EXECUTOR.execute(() -> {
            WidgetData data = load(context);
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName component = new ComponentName(context, SidebarWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(component);
            for (int id : ids) {
                Bundle options = manager.getAppWidgetOptions(id);
                apply(context, manager, id, data, options);
            }
        });
    }

    public static WidgetData load(Context context) {
        WidgetData data = WidgetPrefs.loadLastGood(context);
        SharedSnapshot snapshot = SharedSnapshot.read(context);

        try {
            LocationContext location = resolveLocation(snapshot);

            Calendar now = Calendar.getInstance(TimeZone.getTimeZone(location.timezone), Locale.US);
            putIfPresent(data, "clock", formatClock(now));
            putIfPresent(data, "hebrewDate", fetchHebrewDate(now, snapshot.language));
            putIfPresent(data, "gregorianDate", formatGregorian(now, snapshot.language));

            JSONObject shabbat = fetchShabbat(location.lat, location.lng, location.timezone, now, snapshot.language);
            if (shabbat != null) {
                putIfPresent(data, "parsha", shabbat.optString("parsha", ""));
                putIfPresent(data, "shabbatEnter", shabbat.optString("enter", ""));
                putIfPresent(data, "shabbatExit", shabbat.optString("exit", ""));
            }

            JSONObject weather = fetchWeather(location.lat, location.lng, snapshot.serverUrl, snapshot.slug, snapshot.language);
            if (weather != null) {
                putIfPresent(data, "weather", weather.optString("label", ""));
            }

            String announcement = snapshot.announcement;
            if ((announcement == null || announcement.isEmpty())
                && snapshot.serverUrl != null && !snapshot.serverUrl.isEmpty()
                && snapshot.slug != null && !snapshot.slug.isEmpty()) {
                announcement = fetchFirstAnnouncement(snapshot.serverUrl, snapshot.slug, snapshot.language);
            }
            if (announcement != null && !announcement.isEmpty()) {
                data.announcement = announcement;
            }
        } catch (Exception ignored) {
            // Keep last good data.
        }

        WidgetPrefs.saveLastGood(context, data);
        return data;
    }

    private static void putIfPresent(WidgetData data, String field, String value) {
        if (value == null || value.trim().isEmpty()) {
            return;
        }

        switch (field) {
            case "clock":
                data.clock = value;
                break;
            case "hebrewDate":
                data.hebrewDate = value;
                break;
            case "gregorianDate":
                data.gregorianDate = value;
                break;
            case "parsha":
                data.parsha = value;
                break;
            case "shabbatEnter":
                data.shabbatEnter = value;
                break;
            case "shabbatExit":
                data.shabbatExit = value;
                break;
            case "weather":
                data.weather = value;
                break;
            default:
                break;
        }
    }

    private static void apply(Context context, AppWidgetManager manager, int widgetId, WidgetData data, Bundle options) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_sidebar);
        views.setTextViewText(R.id.widget_clock, safeText(data.clock, "--:--"));
        views.setTextViewText(R.id.widget_hebrew_date, safeText(data.hebrewDate, ""));
        views.setTextViewText(R.id.widget_gregorian_date, safeText(data.gregorianDate, ""));
        views.setTextViewText(R.id.widget_parsha, safeText(data.parsha, ""));
        views.setTextViewText(R.id.widget_shabbat_enter, safeText(data.shabbatEnter, ""));
        views.setTextViewText(R.id.widget_shabbat_exit, safeText(data.shabbatExit, ""));
        views.setTextViewText(R.id.widget_weather, safeText(data.weather, ""));
        views.setTextViewText(R.id.widget_announcement, safeText(data.announcement, ""));

        boolean compact = isCompact(options);
        setVisibility(views, R.id.widget_hebrew_date, compact ? View.GONE : visibilityFor(data.hebrewDate));
        setVisibility(views, R.id.widget_gregorian_date, visibilityFor(data.gregorianDate));
        setVisibility(views, R.id.widget_parsha, compact ? View.GONE : visibilityFor(data.parsha));
        setVisibility(views, R.id.widget_shabbat_enter, compact ? View.GONE : visibilityFor(data.shabbatEnter));
        setVisibility(views, R.id.widget_shabbat_exit, compact ? View.GONE : visibilityFor(data.shabbatExit));
        setVisibility(views, R.id.widget_weather, compact ? View.GONE : visibilityFor(data.weather));
        setVisibility(views, R.id.widget_announcement, compact ? View.GONE : visibilityFor(data.announcement));

        if (!compact && data.announcement != null && !data.announcement.isEmpty()) {
            views.setInt(R.id.widget_announcement, "setSelected", 1);
        }

        manager.updateAppWidget(widgetId, views);
    }

    private static boolean isCompact(Bundle options) {
        if (options == null) {
            return false;
        }

        int minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180);
        int minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180);
        return minWidth < 150 || minHeight < 150;
    }

    private static int visibilityFor(String value) {
        return value == null || value.trim().isEmpty() ? View.GONE : View.VISIBLE;
    }

    private static void setVisibility(RemoteViews views, int viewId, int visibility) {
        views.setViewVisibility(viewId, visibility);
    }

    private static String safeText(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value;
    }

    private static String formatClock(Calendar now) {
        SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.UK);
        clock.setTimeZone(now.getTimeZone());
        return clock.format(now.getTime());
    }

    private static String formatGregorian(Calendar now, String lang) {
        SimpleDateFormat formatter = new SimpleDateFormat("d MMMM yyyy", WidgetI18n.gregorianLocale(lang));
        formatter.setTimeZone(now.getTimeZone());
        return formatter.format(now.getTime());
    }

    private static String fetchHebrewDate(Calendar now, String lang) throws Exception {
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        String url = "https://www.hebcal.com/converter?cfg=json&gy=" + year + "&gm=" + month + "&gd=" + day + "&g2h=1";
        JSONObject json = fetchJson(url);
        if (json == null) {
            return "";
        }

        String hebrew = json.optString("hebrew", "");
        if (!hebrew.isEmpty()) {
            return hebrew;
        }

        if (!"he".equals(lang)) {
            int hebrewDay = json.optInt("hd", 0);
            int hebrewYear = json.optInt("hy", 0);
            String monthName = json.optString("hm", "");
            if (hebrewDay > 0 && hebrewYear > 0 && !monthName.isEmpty()) {
                return hebrewDay + " " + monthName + " " + hebrewYear;
            }
        }

        int hebrewDay = json.optInt("hd", 0);
        int hebrewYear = json.optInt("hy", 0);
        String monthName = json.optString("hm", "");
        if (hebrewDay > 0 && hebrewYear > 0 && !monthName.isEmpty()) {
            return hebrewDay + " " + monthName + " " + hebrewYear;
        }

        return "";
    }

    private static JSONObject fetchShabbat(double lat, double lng, String timezone, Calendar now, String lang) throws Exception {
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        String url = "https://www.hebcal.com/shabbat?cfg=json&geo=pos"
            + "&latitude=" + lat
            + "&longitude=" + lng
            + "&tzid=" + URLEncoder.encode(timezone, "UTF-8")
            + "&M=on&b=18&gy=" + year
            + "&gm=" + month
            + "&gd=" + day;

        JSONObject json = fetchJson(url);
        if (json == null) {
            return null;
        }

        JSONArray items = json.optJSONArray("items");
        if (items == null) {
            return null;
        }

        JSONObject result = new JSONObject();
        List<Date> candles = new ArrayList<>();
        List<Date> havdalah = new ArrayList<>();
        long nowMs = System.currentTimeMillis();

        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            String category = item.optString("category", "");
            if ("parashat".equals(category)) {
                String parsha = "he".equals(lang)
                    ? item.optString("hebrew", item.optString("title", ""))
                    : item.optString("title", item.optString("hebrew", ""));
                result.put("parsha", parsha);
            }
            if ("candles".equals(category) && item.has("date")) {
                Date enter = parseIsoDate(item.getString("date"));
                if (enter != null) {
                    candles.add(enter);
                }
            }
            if ("havdalah".equals(category) && item.has("date")) {
                Date exit = parseIsoDate(item.getString("date"));
                if (exit != null) {
                    havdalah.add(exit);
                }
            }
        }

        Date nextEnter = null;
        Date nextExit = null;

        for (Date enter : candles) {
            Date exit = null;
            for (Date candidate : havdalah) {
                if (candidate.after(enter)) {
                    exit = candidate;
                    break;
                }
            }
            if (exit == null) {
                continue;
            }

            if (enter.getTime() <= nowMs && nowMs < exit.getTime()) {
                nextEnter = enter;
                nextExit = exit;
                break;
            }

            if (enter.getTime() > nowMs) {
                nextEnter = enter;
                nextExit = exit;
                break;
            }
        }

        if (nextEnter == null && !candles.isEmpty() && !havdalah.isEmpty()) {
            nextEnter = candles.get(candles.size() - 1);
            nextExit = havdalah.get(havdalah.size() - 1);
        }

        SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.UK);
        clock.setTimeZone(TimeZone.getTimeZone(timezone));

        if (nextEnter != null) {
            result.put("enter", WidgetI18n.shabbatEnter(lang) + " " + clock.format(nextEnter));
        }
        if (nextExit != null) {
            result.put("exit", WidgetI18n.shabbatExit(lang) + " " + clock.format(nextExit));
        }

        return result;
    }

    private static JSONObject fetchWeather(double lat, double lng, String serverUrl, String slug, String lang) throws Exception {
        JSONObject json = null;
        if (serverUrl != null && !serverUrl.isEmpty() && slug != null && !slug.isEmpty()) {
            String url = serverUrl.replaceAll("/+$", "") + "/s/" + URLEncoder.encode(slug, "UTF-8") + "/api/weather";
            json = fetchJson(url);
        }

        if (json == null || !json.has("current")) {
            String openMeteoUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng
                + "&current=temperature_2m,weather_code"
                + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
                + "&timezone=auto&forecast_days=4";
            json = fetchJson(openMeteoUrl);
        }

        return parseWeatherJson(json, lang);
    }

    private static JSONObject parseWeatherJson(JSONObject json, String lang) throws Exception {
        if (json == null || !json.has("current")) {
            return null;
        }

        JSONObject current = json.getJSONObject("current");
        int code = current.optInt("weather_code", -1);
        double temp = current.optDouble("temperature_2m", Double.NaN);
        String label = WidgetI18n.weatherLabel(lang, code);
        if (!Double.isNaN(temp)) {
            label = Math.round(temp) + "°  " + label;
        }

        JSONArray dailyTime = null;
        JSONObject daily = json.optJSONObject("daily");
        if (daily != null) {
            dailyTime = daily.optJSONArray("time");
        }

        if (daily != null && dailyTime != null && dailyTime.length() > 1) {
            StringBuilder forecast = new StringBuilder(label);
            JSONArray maxTemps = daily.optJSONArray("temperature_2m_max");
            JSONArray minTemps = daily.optJSONArray("temperature_2m_min");
            int days = Math.min(3, dailyTime.length() - 1);
            for (int i = 1; i <= days; i += 1) {
                if (maxTemps != null && minTemps != null) {
                    forecast.append(" · ")
                        .append(Math.round(maxTemps.optDouble(i, 0)))
                        .append("°/")
                        .append(Math.round(minTemps.optDouble(i, 0)))
                        .append("°");
                }
            }
            label = forecast.toString();
        }

        JSONObject result = new JSONObject();
        result.put("label", label);
        return result;
    }

    private static String fetchFirstAnnouncement(String serverUrl, String slug, String lang) throws Exception {
        String url = serverUrl.replaceAll("/+$", "") + "/s/" + URLEncoder.encode(slug, "UTF-8")
            + "/api/sidebar-app?lang=" + URLEncoder.encode(lang == null ? "ru" : lang, "UTF-8");
        JSONObject json = fetchJson(url);
        if (json == null) {
            return "";
        }

        JSONArray holidays = json.optJSONArray("upcomingHolidays");
        if (holidays != null && holidays.length() > 0) {
            return holidays.getJSONObject(0).optString("title", "");
        }

        JSONArray chabad = json.optJSONArray("chabadDates");
        if (chabad != null && chabad.length() > 0) {
            return chabad.getJSONObject(0).optString("title", "");
        }

        JSONArray events = json.optJSONArray("communityEvents");
        if (events != null && events.length() > 0) {
            return events.getJSONObject(0).optString("title", "");
        }

        return "";
    }

    private static LocationContext resolveLocation(SharedSnapshot snapshot) throws Exception {
        if (snapshot.serverUrl != null && !snapshot.serverUrl.isEmpty()
            && snapshot.slug != null && !snapshot.slug.isEmpty()) {
            JSONObject synagogue = fetchSynagogueLocation(snapshot.serverUrl, snapshot.slug);
            if (synagogue != null) {
                double lat = synagogue.optDouble("lat", snapshot.lat);
                double lng = synagogue.optDouble("long", snapshot.lng);
                String timezone = synagogue.optString("timezone", snapshot.timezone);
                if (timezone == null || timezone.isEmpty()) {
                    timezone = resolveTimezone(lat, lng);
                }
                return new LocationContext(lat, lng, timezone);
            }
        }

        String timezone = snapshot.timezone;
        if (timezone == null || timezone.isEmpty()) {
            timezone = resolveTimezone(snapshot.lat, snapshot.lng);
        }

        return new LocationContext(snapshot.lat, snapshot.lng, timezone);
    }

    private static JSONObject fetchSynagogueLocation(String serverUrl, String slug) throws Exception {
        String url = serverUrl.replaceAll("/+$", "") + "/s/" + URLEncoder.encode(slug, "UTF-8")
            + "/api/sidebar-app";
        JSONObject json = fetchJson(url);
        if (json == null) {
            return null;
        }

        return json.optJSONObject("location");
    }

    private static String resolveTimezone(double lat, double lng) throws Exception {
        String url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng + "&current=temperature_2m&timezone=auto";
        JSONObject json = fetchJson(url);
        if (json != null && json.has("timezone")) {
            return json.getString("timezone");
        }
        return "UTC";
    }

    private static JSONObject fetchJson(String urlString) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setConnectTimeout(12000);
        connection.setReadTimeout(12000);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "KaddishSidebarWidget/1.0");

        int code = connection.getResponseCode();
        if (code < 200 || code >= 300) {
            connection.disconnect();
            return null;
        }

        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
        } finally {
            connection.disconnect();
        }

        if (body.length() == 0) {
            return null;
        }

        return new JSONObject(body.toString());
    }

    private static Date parseIsoDate(String value) {
        String[] patterns = {
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd'T'HH:mm:ss'Z'"
        };

        for (String pattern : patterns) {
            try {
                SimpleDateFormat format = new SimpleDateFormat(pattern, Locale.US);
                if (pattern.contains("X") || pattern.contains("Z")) {
                    format.setTimeZone(TimeZone.getTimeZone("UTC"));
                }
                return format.parse(value);
            } catch (Exception ignored) {
                // try next pattern
            }
        }

        return null;
    }

    private static final class LocationContext {
        final double lat;
        final double lng;
        final String timezone;

        private LocationContext(double lat, double lng, String timezone) {
            this.lat = lat;
            this.lng = lng;
            this.timezone = timezone;
        }
    }

    private static final class SharedSnapshot {
        final String serverUrl;
        final String slug;
        final String language;
        final double lat;
        final double lng;
        final String timezone;
        final String announcement;

        private SharedSnapshot(String serverUrl, String slug, String language, double lat, double lng, String timezone, String announcement) {
            this.serverUrl = serverUrl;
            this.slug = slug;
            this.language = language;
            this.lat = lat;
            this.lng = lng;
            this.timezone = timezone;
            this.announcement = announcement;
        }

        static SharedSnapshot read(Context context) {
            android.content.SharedPreferences prefs = WidgetPrefs.prefs(context);
            String serverUrl = prefs.getString("server_url", "");
            String slug = prefs.getString("slug", "");
            ParsedServer parsed = parseServerSettings(serverUrl, slug);
            return new SharedSnapshot(
                parsed.serverUrl,
                parsed.slug,
                prefs.getString("language", "ru"),
                prefs.getFloat("lat", 54.9833f),
                prefs.getFloat("lng", 82.8964f),
                prefs.getString("timezone", "Asia/Novosibirsk"),
                prefs.getString("announcement", "")
            );
        }

        private static ParsedServer parseServerSettings(String serverUrl, String slug) {
            String base = serverUrl == null ? "" : serverUrl.trim().replaceAll("/+$", "");
            String parsedSlug = slug == null ? "" : slug.trim();

            java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^(https?://[^/]+)/s/([^/?#]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(base);
            if (matcher.find()) {
                base = matcher.group(1);
                if (parsedSlug.isEmpty()) {
                    parsedSlug = matcher.group(2);
                }
            }

            return new ParsedServer(base, parsedSlug);
        }

        private static final class ParsedServer {
            final String serverUrl;
            final String slug;

            private ParsedServer(String serverUrl, String slug) {
                this.serverUrl = serverUrl;
                this.slug = slug;
            }
        }
    }
}
