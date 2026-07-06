package com.synagogue.sidebar;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.synagogue.sidebar.widget.SidebarWidgetProvider;
import com.synagogue.sidebar.widget.WidgetDataLoader;
import com.synagogue.sidebar.widget.WidgetPrefs;

@CapacitorPlugin(name = "WidgetSync")
public class WidgetSyncPlugin extends Plugin {
    @PluginMethod
    public void sync(PluginCall call) {
        String serverUrl = call.getString("serverUrl", "");
        String slug = call.getString("slug", "");
        String language = call.getString("language", "ru");
        double lat = call.getDouble("lat", 54.9833);
        double lng = call.getDouble("lng", 82.8964);
        String timezone = call.getString("timezone", "Asia/Novosibirsk");
        String announcementsJson = call.getString("announcementsJson", "[]");
        String weatherJson = call.getString("weatherJson", "");

        WidgetPrefs.saveSnapshot(
            getContext(),
            serverUrl,
            slug,
            language,
            lat,
            lng,
            timezone,
            announcementsJson,
            weatherJson
        );

        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName component = new ComponentName(getContext(), SidebarWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        WidgetDataLoader.applyCachedWidgets(getContext(), manager, ids);
        WidgetDataLoader.updateAllWidgets(getContext());

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }
}
