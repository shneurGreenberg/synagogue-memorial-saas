package com.synagogue.sidebar;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
        String announcement = call.getString("announcement", "");

        WidgetPrefs.saveSnapshot(getContext(), serverUrl, slug, language, lat, lng, timezone, announcement);
        WidgetDataLoader.updateAllWidgets(getContext());

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }
}
