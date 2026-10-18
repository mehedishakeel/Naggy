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
    android:padding="14dp"
    android:orientation="vertical">

    <!-- Header: App Name & Status Pill -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_brand"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="NAGGY"
            android:textStyle="bold"
            android:textColor="#FF5A45"
            android:textSize="12sp"
            android:letterSpacing="0.08" />

        <TextView
            android:id="@+id/widget_badge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="OVERDUE"
            android:textStyle="bold"
            android:textColor="#FFFFFF"
            android:textSize="10sp"
            android:paddingLeft="8dp"
            android:paddingRight="8dp"
            android:paddingTop="2dp"
            android:paddingBottom="2dp"
            android:background="#FF3B30" />
    </LinearLayout>

    <!-- Task Title -->
    <TextView
        android:id="@+id/widget_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No pending tasks"
        android:textStyle="bold"
        android:textColor="#1F2937"
        android:textSize="15sp"
        android:maxLines="2"
        android:ellipsize="end"
        android:layout_marginTop="6dp" />

    <!-- Subtitle / Meta -->
    <TextView
        android:id="@+id/widget_desc"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Tap to open your agenda"
        android:textColor="#6B7280"
        android:textSize="12sp"
        android:layout_marginTop="2dp" />

    <!-- 1-Tap Action Buttons Row -->
    <LinearLayout
        android:id="@+id/widget_actions_row"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="10dp"
        android:gravity="center_vertical">

        <Button
            android:id="@+id/widget_btn_complete"
            android:layout_width="0dp"
            android:layout_height="36dp"
            android:layout_weight="1"
            android:text="✓ Complete"
            android:textColor="#FFFFFF"
            android:textSize="11sp"
            android:textStyle="bold"
            android:background="#10B981" />

        <Space
            android:layout_width="8dp"
            android:layout_height="match_parent" />

        <Button
            android:id="@+id/widget_btn_snooze"
            android:layout_width="0dp"
            android:layout_height="36dp"
            android:layout_weight="1"
            android:text="+15m Snooze"
            android:textColor="#374151"
            android:textSize="11sp"
            android:background="#E5E7EB" />
    </LinearLayout>
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
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class NaggyWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.naggy_widget_layout);

        String taskTitle = "All caught up! 🎉";
        String taskDesc = "No pending tasks right now.";
        String badgeText = "ALL CLEAR";
        int badgeColor = 0xFF10B981;
        boolean showActions = false;
        String taskId = null;

        try {
            File file = new File(context.getFilesDir(), "naggy_widget_data.json");
            if (file.exists()) {
                FileInputStream fis = new FileInputStream(file);
                byte[] data = new byte[(int) file.length()];
                fis.read(data);
                fis.close();
                String content = new String(data, StandardCharsets.UTF_8);
                JSONObject json = new JSONObject(content);

                int overdueCount = json.optInt("overdueCount", 0);
                int todayCount = json.optInt("todayCount", 0);
                JSONObject topTask = json.optJSONObject("topOverdueTask");

                if (topTask != null) {
                    taskId = topTask.optString("id");
                    taskTitle = topTask.optString("title", "Overdue Task");
                    String dueTime = topTask.optString("dueTime", "");
                    taskDesc = dueTime.isEmpty() ? "Overdue task" : "Due at " + dueTime + " (Nagging)";
                    badgeText = overdueCount > 1 ? overdueCount + " OVERDUE" : "OVERDUE";
                    badgeColor = 0xFFFF3B30;
                    showActions = (taskId != null && !taskId.isEmpty());
                } else if (todayCount > 0) {
                    taskTitle = "You have " + todayCount + " task" + (todayCount > 1 ? "s" : "") + " today";
                    taskDesc = "Tap to view today's scheduled agenda";
                    badgeText = todayCount + " TODAY";
                    badgeColor = 0xFF3B82F6;
                    showActions = false;
                }
            }
        } catch (Exception e) {
            taskTitle = "Naggy Glance";
            taskDesc = "Tap to open your pending tasks";
        }

        views.setTextViewText(R.id.widget_title, taskTitle);
        views.setTextViewText(R.id.widget_desc, taskDesc);
        views.setTextViewText(R.id.widget_badge, badgeText);
        views.setInt(R.id.widget_badge, "setBackgroundColor", badgeColor);

        // Container default click opens the app
        Intent openAppIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("naggy://today"));
        openAppIntent.setPackage(context.getPackageName());
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, openPending);

        if (showActions && taskId != null) {
            views.setViewVisibility(R.id.widget_actions_row, View.VISIBLE);

            // Complete button deep link
            Intent completeIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("naggy://widget-action?action=complete&taskId=" + Uri.encode(taskId)));
            completeIntent.setPackage(context.getPackageName());
            completeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent completePending = PendingIntent.getActivity(context, appWidgetId * 10 + 1, completeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_btn_complete, completePending);

            // Snooze button deep link
            Intent snoozeIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("naggy://widget-action?action=snooze&taskId=" + Uri.encode(taskId)));
            snoozeIntent.setPackage(context.getPackageName());
            snoozeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent snoozePending = PendingIntent.getActivity(context, appWidgetId * 10 + 2, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_btn_snooze, snoozePending);
        } else {
            views.setViewVisibility(R.id.widget_actions_row, View.GONE);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
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
