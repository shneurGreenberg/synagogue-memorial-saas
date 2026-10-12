package com.synagogue.sidebar.widget;

public final class ServerUrls {
    public static final String DEFAULT_SERVER_URL = "https://synagogue-kadish-waw-shneur.waw0.amvera.tech";
    // Legacy production host (Moscow region, shut down). Used only for migrating saved settings.
    private static final String LEGACY_HOST = "synagogue-kadish-shneur.amvera.io";

    private ServerUrls() {}

    /** Rewrites a URL that points to the legacy host to the current production host. */
    public static String migrate(String url) {
        if (url == null || url.trim().isEmpty()) return DEFAULT_SERVER_URL;
        String trimmed = url.trim();
        String lower = trimmed.toLowerCase(java.util.Locale.ROOT);
        String[] prefixes = {"https://" + LEGACY_HOST, "http://" + LEGACY_HOST};
        for (String p : prefixes) {
            if (lower.startsWith(p)) {
                return DEFAULT_SERVER_URL + trimmed.substring(p.length());
            }
        }
        return trimmed;
    }

    /** Migrates server_url stored in widget SharedPreferences, if needed. */
    public static void migratePrefs(android.content.Context context) {
        android.content.SharedPreferences prefs = WidgetPrefs.prefs(context);
        String current = prefs.getString("server_url", null);
        if (current == null) return;
        String migrated = migrate(current);
        if (!migrated.equals(current)) {
            prefs.edit().putString("server_url", migrated).apply();
        }
    }
}
