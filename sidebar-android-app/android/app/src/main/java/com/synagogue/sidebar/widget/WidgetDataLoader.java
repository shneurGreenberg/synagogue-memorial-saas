package com.synagogue.sidebar.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
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
import java.util.Calendar;
import java.util.Date;
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
                apply(context, manager, id, data);
            }
        });
    }

    public static WidgetData load(Context context) {
        WidgetData data = new WidgetData();
        SharedSnapshot snapshot = SharedSnapshot.read(context);

        try {
            String timezone = snapshot.timezone;
            if (timezone == null || timezone.isEmpty()) {
                timezone = resolveTimezone(snapshot.lat, snapshot.lng);
            }

            Calendar now = Calendar.getInstance(TimeZone.getTimeZone(timezone), Locale.US);
            data.clock = formatClock(now);
            data.gregorianDate = formatGregorian(now, snapshot.language);
            data.hebrewDate = fetchHebrewDate(now, timezone);

            JSONObject shabbat = fetchShabbat(snapshot.lat, snapshot.lng, timezone, now);
            if (shabbat != null) {
                data.parsha = shabbat.optString("parsha", "");
                data.shabbatEnter = shabbat.optString("enter", "");
                data.shabbatExit = shabbat.optString("exit", "");
            }

            JSONObject weather = fetchWeather(snapshot.lat, snapshot.lng, snapshot.serverUrl, snapshot.slug);
            if (weather != null) {
                data.weather = weather.optString("label", "");
            }

            String announcement = snapshot.announcement;
            if ((announcement == null || announcement.isEmpty()) && snapshot.serverUrl != null && !snapshot.serverUrl.isEmpty() && snapshot.slug != null && !snapshot.slug.isEmpty()) {
                announcement = fetchFirstAnnouncement(snapshot.serverUrl, snapshot.slug, snapshot.language);
            }
            data.announcement = announcement == null ? "" : announcement;
        } catch (Exception ignored) {
            // Keep partial data.
        }

        return data;
    }

    private static void apply(Context context, AppWidgetManager manager, int widgetId, WidgetData data) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_sidebar);
        views.setTextViewText(R.id.widget_clock, data.clock);
        views.setTextViewText(R.id.widget_hebrew_date, data.hebrewDate);
        views.setTextViewText(R.id.widget_gregorian_date, data.gregorianDate);
        views.setTextViewText(R.id.widget_parsha, data.parsha);
        views.setTextViewText(R.id.widget_shabbat_enter, data.shabbatEnter);
        views.setTextViewText(R.id.widget_shabbat_exit, data.shabbatExit);
        views.setTextViewText(R.id.widget_weather, data.weather);
        views.setTextViewText(R.id.widget_announcement, data.announcement);
        manager.updateAppWidget(widgetId, views);
    }

    private static String formatClock(Calendar now) {
        SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.UK);
        clock.setTimeZone(now.getTimeZone());
        return clock.format(now.getTime());
    }

    private static String formatGregorian(Calendar now, String lang) {
        Locale locale = "he".equals(lang) ? new Locale("he", "IL") : ("en".equals(lang) ? Locale.US : new Locale("ru", "RU"));
        SimpleDateFormat formatter = new SimpleDateFormat("d MMMM yyyy", locale);
        formatter.setTimeZone(now.getTimeZone());
        return formatter.format(now.getTime());
    }

    private static String fetchHebrewDate(Calendar now, String timezone) throws Exception {
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        String url = "https://www.hebcal.com/converter?cfg=json&gy=" + year + "&gm=" + month + "&gd=" + day + "&g2h=1";
        JSONObject json = fetchJson(url);
        if (json == null) {
            return "";
        }

        JSONObject hebrew = json.optJSONObject("hebrew");
        if (hebrew == null) {
            return json.optString("hebrew", "");
        }

        String monthName = hebrew.optString("hebrew", hebrew.optString("month", ""));
        int hebrewDay = hebrew.optInt("hd", hebrew.optInt("day", 0));
        int hebrewYear = hebrew.optInt("hy", hebrew.optInt("year", 0));
        if (hebrewDay == 0 || hebrewYear == 0) {
            return json.optString("hebrew", "");
        }

        return hebrewDay + " " + monthName + " " + hebrewYear;
    }

    private static JSONObject fetchShabbat(double lat, double lng, String timezone, Calendar now) throws Exception {
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        String url = "https://www.hebcal.com/shabbat?cfg=json&geo=pos"
            + "&latitude=" + lat
            + "&longitude=" + lng
            + "&tzid=" + URLEncoder.encode(timezone, "UTF-8")
            + "&M=on&gy=" + year
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
        Date nextEnter = null;
        Date nextExit = null;
        long nowMs = System.currentTimeMillis();

        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            String category = item.optString("category", "");
            if ("parashat".equals(category)) {
                result.put("parsha", item.optString("title", item.optString("hebrew", "")));
            }
            if ("candles".equals(category) && item.has("date")) {
                Date enter = parseIsoDate(item.getString("date"));
                if (enter != null && enter.getTime() >= nowMs - 48L * 60 * 60 * 1000) {
                    if (nextEnter == null || enter.before(nextEnter)) {
                        nextEnter = enter;
                    }
                }
            }
            if ("havdalah".equals(category) && item.has("date")) {
                Date exit = parseIsoDate(item.getString("date"));
                if (exit != null && exit.getTime() > nowMs) {
                    if (nextExit == null || exit.before(nextExit)) {
                        nextExit = exit;
                    }
                }
            }
        }

        SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.UK);
        clock.setTimeZone(TimeZone.getTimeZone(timezone));

        if (nextEnter != null) {
            result.put("enter", "כניסה " + clock.format(nextEnter));
        }
        if (nextExit != null) {
            result.put("exit", "יציאה " + clock.format(nextExit));
        }

        return result;
    }

    private static JSONObject fetchWeather(double lat, double lng, String serverUrl, String slug) throws Exception {
        String url;
        if (serverUrl != null && !serverUrl.isEmpty() && slug != null && !slug.isEmpty()) {
            url = serverUrl.replaceAll("/+$", "") + "/s/" + URLEncoder.encode(slug, "UTF-8") + "/api/weather";
        } else {
            url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng
                + "&current=temperature_2m,weather_code&timezone=auto";
        }

        JSONObject json = fetchJson(url);
        if (json == null || !json.has("current")) {
            return null;
        }

        JSONObject current = json.getJSONObject("current");
        int code = current.optInt("weather_code", -1);
        double temp = current.optDouble("temperature_2m", Double.NaN);
        String label = weatherLabel(code);
        if (!Double.isNaN(temp)) {
            label = Math.round(temp) + "°  " + label;
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

        JSONArray events = json.optJSONArray("communityEvents");
        if (events != null && events.length() > 0) {
            return events.getJSONObject(0).optString("title", "");
        }

        JSONArray holidays = json.optJSONArray("upcomingHolidays");
        if (holidays != null && holidays.length() > 0) {
            return holidays.getJSONObject(0).optString("title", "");
        }

        return "";
    }

    private static String resolveTimezone(double lat, double lng) throws Exception {
        String url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng + "&current=temperature_2m&timezone=auto";
        JSONObject json = fetchJson(url);
        if (json != null && json.has("timezone")) {
            return json.getString("timezone");
        }
        return "UTC";
    }

    private static String weatherLabel(int code) {
        if (code == 0) return "בהיר";
        if (code <= 3) return "מעונן";
        if (code <= 48) return "ערפל";
        if (code <= 67) return "גשם";
        if (code <= 77) return "שלג";
        if (code <= 82) return "ממטרים";
        if (code >= 95) return "סופה";
        return "מזג אוויר";
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
            return new SharedSnapshot(
                prefs.getString("server_url", ""),
                prefs.getString("slug", ""),
                prefs.getString("language", "ru"),
                prefs.getFloat("lat", 54.9833f),
                prefs.getFloat("lng", 82.8964f),
                prefs.getString("timezone", "Asia/Novosibirsk"),
                prefs.getString("announcement", "")
            );
        }
    }
}
