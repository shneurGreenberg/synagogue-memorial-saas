package com.synagogue.sidebar;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        com.synagogue.sidebar.widget.ServerUrls.migratePrefs(this);
        registerPlugin(WidgetSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
