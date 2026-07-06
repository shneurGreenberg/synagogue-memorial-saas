package com.synagogue.sidebar.widget;

final class WidgetAnnouncementItem {
    final String date;
    final String title;
    final String text;
    final String type;

    WidgetAnnouncementItem(String date, String title, String text, String type) {
        this.date = date == null ? "" : date;
        this.title = title == null ? "" : title;
        this.text = text == null ? "" : text;
        this.type = type == null ? "holiday" : type;
    }
}
