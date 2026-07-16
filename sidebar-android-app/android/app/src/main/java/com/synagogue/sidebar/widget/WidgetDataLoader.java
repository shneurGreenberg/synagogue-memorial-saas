package com.synagogue.sidebar.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.synagogue.sidebar.MainActivity;
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
        EXECUTOR.execute(() -> refreshWidgets(context));
    }

    public static void applyCachedWidgets(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        SharedSnapshot snapshot = SharedSnapshot.read(context);
        WidgetData data = WidgetPrefs.loadLastGood(context, snapshot.language);
        data.announcementsTitle = WidgetI18n.upcomingTitle(snapshot.language);
        WidgetWeatherStore.applyTo(context, data);

        try {
            Calendar now = Calendar.getInstance(
                TimeZone.getTimeZone(snapshot.timezone == null || snapshot.timezone.isEmpty() ? "UTC" : snapshot.timezone),
                Locale.US
            );
            if (!hasText(data.clock) || "--:--".equals(data.clock)) {
                data.clock = formatClock(now);
            }
            if (!hasText(data.gregorianDate)) {
                data.gregorianDate = formatGregorian(now, snapshot.language);
            }
        } catch (Exception ignored) {
            // Keep cached values.
        }

        for (int id : appWidgetIds) {
            apply(context, manager, id, data);
        }
    }

    private static void refreshWidgets(Context context) {
        WidgetData data = load(context);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, SidebarWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            apply(context, manager, id, data);
        }
    }

    public static WidgetData load(Context context) {
        SharedSnapshot snapshot = SharedSnapshot.read(context);
        WidgetData data = WidgetPrefs.loadLastGood(context, snapshot.language);
        data.announcementsTitle = WidgetI18n.upcomingTitle(snapshot.language);
        WidgetWeatherStore.applyTo(context, data);

        Calendar now;
        try {
            LocationContext location = resolveLocation(snapshot);
            now = Calendar.getInstance(TimeZone.getTimeZone(location.timezone), Locale.US);
            data.clock = formatClock(now);
            data.gregorianDate = formatGregorian(now, snapshot.language);
            putIfPresent(data, "hebrewDate", fetchHebrewDate(now, snapshot.language));

            JSONObject shabbat = fetchShabbat(location.lat, location.lng, location.timezone, now, snapshot.language);
            if (shabbat != null) {
                data.parshaHeading = WidgetI18n.weeklyChapter(snapshot.language);
                putIfPresent(data, "parshaName", shabbat.optString("parsha", ""));
                data.shabbatEnterLabel = WidgetI18n.shabbatEnter(snapshot.language);
                putIfPresent(data, "shabbatEnterTime", shabbat.optString("enter", ""));
                data.shabbatExitLabel = WidgetI18n.shabbatExit(snapshot.language);
                putIfPresent(data, "shabbatExitTime", shabbat.optString("exit", ""));
            }

            JSONObject weather = fetchWeather(location.lat, location.lng, location.timezone, snapshot.serverUrl, snapshot.slug, snapshot.language);
            if (weather != null) {
                putIfPresent(data, "weatherTemp", weather.optString("temp", ""));
                putIfPresent(data, "weatherIcon", weather.optString("icon", ""));
                putIfPresent(data, "weatherLabel", weather.optString("label", ""));
                putIfPresent(data, "sunriseText", weather.optString("sunrise", ""));
                putIfPresent(data, "sunsetText", weather.optString("sunset", ""));
                putIfPresent(data, "forecast1Date", weather.optString("forecast1Date", ""));
                putIfPresent(data, "forecast1Icon", weather.optString("forecast1Icon", ""));
                putIfPresent(data, "forecast1Temps", weather.optString("forecast1Temps", ""));
                putIfPresent(data, "forecast2Date", weather.optString("forecast2Date", ""));
                putIfPresent(data, "forecast2Icon", weather.optString("forecast2Icon", ""));
                putIfPresent(data, "forecast2Temps", weather.optString("forecast2Temps", ""));
                putIfPresent(data, "forecast3Date", weather.optString("forecast3Date", ""));
                putIfPresent(data, "forecast3Icon", weather.optString("forecast3Icon", ""));
                putIfPresent(data, "forecast3Temps", weather.optString("forecast3Temps", ""));
            }

            if (WidgetAnnouncementsStore.load(context).isEmpty()) {
                String announcementsJson = fetchAnnouncementsJson(snapshot);
                if (announcementsJson != null && !announcementsJson.isEmpty()) {
                    WidgetAnnouncementsStore.save(context, announcementsJson);
                }
            }
        } catch (Exception ignored) {
            try {
                now = Calendar.getInstance(TimeZone.getTimeZone(snapshot.timezone), Locale.US);
                data.clock = formatClock(now);
                data.gregorianDate = formatGregorian(now, snapshot.language);
            } catch (Exception innerIgnored) {
                // Keep cached values.
            }
        }

        WidgetPrefs.saveLastGood(context, data, snapshot.language);
        return data;
    }

    private static String fetchAnnouncementsJson(SharedSnapshot snapshot) {
        if (snapshot.serverUrl == null || snapshot.serverUrl.isEmpty()
            || snapshot.slug == null || snapshot.slug.isEmpty()) {
            return "[]";
        }

        try {
            String url = snapshot.serverUrl.replaceAll("/+$", "") + "/s/" + URLEncoder.encode(snapshot.slug, "UTF-8")
                + "/api/sidebar-app?lang=" + URLEncoder.encode(snapshot.language == null ? "ru" : snapshot.language, "UTF-8");
            JSONObject json = fetchJson(url);
            if (json == null) {
                return "[]";
            }
            return WidgetAnnouncementsStore.buildFromSidebarPayload(json, snapshot.language);
        } catch (Exception ignored) {
            return "[]";
        }
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
            case "parshaName":
                data.parshaName = value;
                break;
            case "shabbatEnterTime":
                data.shabbatEnterTime = value;
                break;
            case "shabbatExitTime":
                data.shabbatExitTime = value;
                break;
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

    private static void apply(Context context, AppWidgetManager manager, int widgetId, WidgetData data) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_sidebar);
            String lang = SharedSnapshot.read(context).language;

            views.setTextViewText(R.id.widget_hebrew_date, safeText(data.hebrewDate, ""));
            views.setTextViewText(R.id.widget_gregorian_date, safeText(data.gregorianDate, ""));

            views.setTextViewText(R.id.widget_clock, safeText(data.clock, "--:--"));
            views.setImageViewResource(R.id.widget_logo, R.drawable.kaddish_logo);
            views.setTextViewText(R.id.widget_parsha_heading, safeText(data.parshaHeading, WidgetI18n.weeklyChapter(lang)));
            views.setTextViewText(R.id.widget_parsha, safeText(data.parshaName, ""));
            views.setTextViewText(R.id.widget_shabbat_enter_label, safeText(data.shabbatEnterLabel, WidgetI18n.shabbatEnter(lang)));
            views.setTextViewText(R.id.widget_shabbat_enter_time, safeText(data.shabbatEnterTime, ""));
            views.setTextViewText(R.id.widget_shabbat_exit_label, safeText(data.shabbatExitLabel, WidgetI18n.shabbatExit(lang)));
            views.setTextViewText(R.id.widget_shabbat_exit_time, safeText(data.shabbatExitTime, ""));

            views.setTextViewText(R.id.widget_weather_icon, safeText(data.weatherIcon, ""));
            views.setTextColor(R.id.widget_weather_icon, WidgetI18n.weatherIconColor(data.weatherIcon));
            views.setTextViewText(R.id.widget_weather_temp, safeText(data.weatherTemp, ""));
            views.setTextViewText(R.id.widget_weather_label, safeText(data.weatherLabel, ""));
            views.setTextViewText(R.id.widget_sunrise, safeText(data.sunriseText, ""));
            views.setTextViewText(R.id.widget_sunset, safeText(data.sunsetText, ""));

            bindForecastSlot(views, R.id.widget_forecast_1, R.id.widget_forecast_1_date, R.id.widget_forecast_1_icon,
                R.id.widget_forecast_1_temps, data.forecast1Date, data.forecast1Icon, data.forecast1Temps);
            bindForecastSlot(views, R.id.widget_forecast_2, R.id.widget_forecast_2_date, R.id.widget_forecast_2_icon,
                R.id.widget_forecast_2_temps, data.forecast2Date, data.forecast2Icon, data.forecast2Temps);
            bindForecastSlot(views, R.id.widget_forecast_3, R.id.widget_forecast_3_date, R.id.widget_forecast_3_icon,
                R.id.widget_forecast_3_temps, data.forecast3Date, data.forecast3Icon, data.forecast3Temps);

            views.setTextViewText(R.id.widget_announcements_title, safeText(data.announcementsTitle, WidgetI18n.upcomingTitle(lang)));

            Intent serviceIntent = new Intent(context, SidebarWidgetService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
            serviceIntent.setData(android.net.Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_announcements_flipper, serviceIntent);
            views.setEmptyView(R.id.widget_announcements_flipper, R.id.widget_empty_view);
            views.setTextViewText(R.id.widget_empty_view, WidgetI18n.noAnnouncements(lang));
            views.setInt(R.id.widget_announcements_flipper, "setFlipInterval", 5000);
            views.setInt(R.id.widget_announcements_flipper, "startFlipping", 0);

            setVisibility(views, R.id.widget_hebrew_date, visibilityFor(data.hebrewDate));
            setVisibility(views, R.id.widget_gregorian_date, visibilityFor(data.gregorianDate));
            setVisibility(views, R.id.widget_parsha_heading, visibilityFor(data.parshaName));
            setVisibility(views, R.id.widget_parsha, visibilityFor(data.parshaName));
            setVisibility(views, R.id.widget_shabbat_block, visibilityFor(data.shabbatEnterTime, data.shabbatExitTime, data.parshaName));
            setVisibility(views, R.id.widget_weather_block, visibilityFor(data.weatherTemp, data.weatherLabel, data.sunriseText));

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, widgetId, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            manager.updateAppWidget(widgetId, views);
            manager.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_announcements_flipper);
        } catch (Exception ignored) {
            // Avoid crashing the widget host if a single update fails.
        }
    }

    private static void bindForecastSlot(
        RemoteViews views,
        int containerId,
        int dateId,
        int iconId,
        int tempsId,
        String date,
        String icon,
        String temps
    ) {
        boolean has = hasText(date) || hasText(temps);
        views.setViewVisibility(containerId, has ? View.VISIBLE : View.GONE);
        if (!has) {
            return;
        }
        views.setTextViewText(dateId, safeText(date, ""));
        views.setTextViewText(iconId, safeText(icon, ""));
        views.setTextColor(iconId, WidgetI18n.weatherIconColor(icon));
        views.setTextViewText(tempsId, safeText(temps, ""));
    }

    private static int visibilityFor(String... values) {
        for (String value : values) {
            if (hasText(value)) {
                return View.VISIBLE;
            }
        }
        return View.GONE;
    }

    private static void setVisibility(RemoteViews views, int viewId, int visibility) {
        views.setViewVisibility(viewId, visibility);
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
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
        if ("he".equals(lang) && !hebrew.isEmpty()) {
            return hebrew;
        }

        int hebrewDay = json.optInt("hd", 0);
        int hebrewYear = json.optInt("hy", 0);
        String monthName = WidgetI18n.hebrewMonth(lang, json.optString("hm", ""));
        if (hebrewDay > 0 && hebrewYear > 0 && !monthName.isEmpty()) {
            return hebrewDay + " " + monthName + " " + hebrewYear;
        }

        if (!hebrew.isEmpty()) {
            return hebrew;
        }

        return "";
    }

    private static JSONObject fetchShabbat(double lat, double lng, String timezone, Calendar now, String lang) throws Exception {
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        String hebcalLang = "he".equals(lang) ? "he" : ("ru".equals(lang) ? "ru" : "en");
        String url = "https://www.hebcal.com/shabbat?cfg=json&geo=pos"
            + "&latitude=" + lat
            + "&longitude=" + lng
            + "&tzid=" + URLEncoder.encode(timezone, "UTF-8")
            + "&M=on&b=18&lg=" + hebcalLang
            + "&gy=" + year
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
                result.put("parsha", parsha.replace("Parashat ", "").replace("Глава ", ""));
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
            result.put("enter", clock.format(nextEnter));
        }
        if (nextExit != null) {
            result.put("exit", clock.format(nextExit));
        }

        return result;
    }

    private static JSONObject fetchWeather(
        double lat,
        double lng,
        String timezone,
        String serverUrl,
        String slug,
        String lang
    ) throws Exception {
        JSONObject json = null;

        String openMeteoUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lng
            + "&current=temperature_2m,weather_code"
            + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,time"
            + "&timezone=auto&forecast_days=4";
        json = fetchJson(openMeteoUrl);

        if ((json == null || !json.has("current")) && serverUrl != null && !serverUrl.isEmpty()
            && slug != null && !slug.isEmpty()) {
            String url = serverUrl.replaceAll("/+$", "") + "/s/" + URLEncoder.encode(slug, "UTF-8") + "/api/weather";
            json = fetchJson(url);
        }

        if (json == null || !json.has("current")) {
            json = fetchJson(openMeteoUrl);
        }

        return parseWeatherJson(json, lang, timezone);
    }

    private static JSONObject parseWeatherJson(JSONObject json, String lang, String timezone) throws Exception {
        if (json == null || !json.has("current")) {
            return null;
        }

        JSONObject current = json.getJSONObject("current");
        int code = current.optInt("weather_code", -1);
        double temp = current.optDouble("temperature_2m", Double.NaN);

        JSONObject result = new JSONObject();
        result.put("icon", WidgetI18n.weatherIcon(code));
        if (!Double.isNaN(temp)) {
            result.put("temp", Math.round(temp) + "°");
        }
        result.put("label", WidgetI18n.weatherLabel(lang, code));

        JSONObject daily = json.optJSONObject("daily");
        if (daily != null) {
            JSONArray sunrise = daily.optJSONArray("sunrise");
            JSONArray sunset = daily.optJSONArray("sunset");
            SimpleDateFormat clock = new SimpleDateFormat("HH:mm", Locale.UK);
            if (timezone != null && !timezone.isEmpty()) {
                clock.setTimeZone(TimeZone.getTimeZone(timezone));
            }

            if (sunrise != null && sunrise.length() > 0) {
                Date sunriseDate = parseIsoDate(sunrise.optString(0));
                if (sunriseDate != null) {
                    result.put("sunrise", WidgetI18n.sunriseLabel(lang) + "  " + clock.format(sunriseDate));
                }
            }
            if (sunset != null && sunset.length() > 0) {
                Date sunsetDate = parseIsoDate(sunset.optString(0));
                if (sunsetDate != null) {
                    result.put("sunset", WidgetI18n.sunsetLabel(lang) + "  " + clock.format(sunsetDate));
                }
            }

            JSONArray dailyTime = daily.optJSONArray("time");
            JSONArray maxTemps = daily.optJSONArray("temperature_2m_max");
            JSONArray minTemps = daily.optJSONArray("temperature_2m_min");
            JSONArray codes = daily.optJSONArray("weather_code");
            Locale locale = WidgetI18n.gregorianLocale(lang);
            SimpleDateFormat dayFormat = new SimpleDateFormat("EEE d", locale);

            for (int slot = 1; slot <= 3; slot += 1) {
                if (dailyTime == null || maxTemps == null || minTemps == null || codes == null) {
                    break;
                }
                if (dailyTime.length() <= slot) {
                    break;
                }

                String dateKey = dailyTime.optString(slot, "");
                Date date = parseIsoDate(dateKey + "T12:00:00");
                String dayLabel = date != null ? dayFormat.format(date) : dateKey;
                String icon = WidgetI18n.weatherIcon(codes.optInt(slot, 0));
                String temps = Math.round(maxTemps.optDouble(slot, 0)) + "°/"
                    + Math.round(minTemps.optDouble(slot, 0)) + "°";

                result.put("forecast" + slot + "Date", dayLabel);
                result.put("forecast" + slot + "Icon", icon);
                result.put("forecast" + slot + "Temps", temps);
            }
        }

        return result;
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

        private SharedSnapshot(String serverUrl, String slug, String language, double lat, double lng, String timezone) {
            this.serverUrl = serverUrl;
            this.slug = slug;
            this.language = language;
            this.lat = lat;
            this.lng = lng;
            this.timezone = timezone;
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
                prefs.getString("timezone", "Asia/Novosibirsk")
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
