package com.synagogue.sidebar.widget;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.synagogue.sidebar.R;

import java.util.ArrayList;
import java.util.List;

public class SidebarWidgetFactory implements RemoteViewsService.RemoteViewsFactory {
    private final Context context;
    private final List<WidgetAnnouncementItem> items = new ArrayList<>();

    public SidebarWidgetFactory(Context context, Intent intent) {
        this.context = context.getApplicationContext();
    }

    @Override
    public void onCreate() {
        items.clear();
        items.addAll(WidgetAnnouncementsStore.load(context));
    }

    @Override
    public void onDataSetChanged() {
        items.clear();
        items.addAll(WidgetAnnouncementsStore.load(context));
    }

    @Override
    public void onDestroy() {
        items.clear();
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        WidgetAnnouncementItem item = items.get(position);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_announcement_item);
        views.setTextViewText(R.id.widget_item_date, item.date);
        views.setTextViewText(R.id.widget_item_title, item.title);

        if (item.text != null && !item.text.isEmpty()) {
            views.setTextViewText(R.id.widget_item_text, item.text);
            views.setViewVisibility(R.id.widget_item_text, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_item_text, View.GONE);
        }

        if ("event".equals(item.type)) {
            views.setInt(R.id.widget_item_title, "setTextColor", 0xFFFFD54F);
        } else {
            views.setInt(R.id.widget_item_title, "setTextColor", 0xFFCFAF1F);
        }

        return views;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
