const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to register the Naggy Android Home Screen AppWidget
 */
function withAndroidWidget(config) {
  // 1. Generate the Android widget resources and Java provider during prebuild
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const resDir = path.join(projectRoot, 'android/app/src/main/res');
      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');
      const javaDir = path.join(projectRoot, 'android/app/src/main/java/com/naggy/app');

      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
      if (!fs.existsSync(layoutDir)) fs.mkdirSync(layoutDir, { recursive: true });
      if (!fs.existsSync(javaDir)) fs.mkdirSync(javaDir, { recursive: true });

      // xml/naggy_widget_info.xml
      const widgetInfoContent = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="40dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/naggy_widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
`;
      fs.writeFileSync(path.join(xmlDir, 'naggy_widget_info.xml'), widgetInfoContent);

      // layout/naggy_widget_layout.xml
      const widgetLayoutContent = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#FFFFFF"
    android:padding="12dp"
    android:orientation="vertical">

    <TextView
        android:id="@+id/widget_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Naggy Glance"
        android:textStyle="bold"
        android:textColor="#FF5A45"
        android:textSize="14sp" />

    <TextView
        android:id="@+id/widget_desc"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Tap to open your pending tasks"
        android:textColor="#666666"
        android:textSize="12sp"
        android:layout_marginTop="4dp" />
</LinearLayout>
`;
      fs.writeFileSync(path.join(layoutDir, 'naggy_widget_layout.xml'), widgetLayoutContent);

      // java/com/naggy/app/NaggyWidgetProvider.java
      const javaContent = `package com.naggy.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class NaggyWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.naggy_widget_layout);
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
`;
      fs.writeFileSync(path.join(javaDir, 'NaggyWidgetProvider.java'), javaContent);

      return modConfig;
    },
  ]);

  // 2. Register the AppWidgetProvider receiver in AndroidManifest.xml
  return withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (!mainApplication) return modConfig;

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const hasReceiver = mainApplication.receiver.some(
      (r) => r.$?.['android:name'] === '.NaggyWidgetProvider'
    );

    if (!hasReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': '.NaggyWidgetProvider',
          'android:exported': 'true',
          'android:label': 'Naggy Quick Glance',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/naggy_widget_info',
            },
          },
        ],
      });
    }

    return modConfig;
  });
}

module.exports = withAndroidWidget;
