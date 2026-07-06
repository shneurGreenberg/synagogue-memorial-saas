package com.synagogue.sidebar.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

public class SidebarWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetDataLoader.applyCachedWidgets(context, appWidgetManager, appWidgetIds);
        WidgetDataLoader.updateAllWidgets(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        WidgetDataLoader.applyCachedWidgets(context, appWidgetManager, new int[] { appWidgetId });
        WidgetDataLoader.updateAllWidgets(context);
    }

    @Override
    public void onEnabled(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new android.content.ComponentName(context, SidebarWidgetProvider.class));
        WidgetDataLoader.applyCachedWidgets(context, manager, ids);
        WidgetDataLoader.updateAllWidgets(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            WidgetDataLoader.updateAllWidgets(context);
        }
    }
}
