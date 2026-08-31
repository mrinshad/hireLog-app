const {
  withAndroidManifest,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PKG_NAME = 'withAndroidWidget';
const PKG_VERSION = '1.0.0';

/**
 * Injects Widget XML layout, drawable backgrounds, widget_info, and Kotlin AppWidgetProvider
 */
const withWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      const javaDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/byten/hirelog'
      );

      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');
      const drawableDir = path.join(resDir, 'drawable');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.mkdirSync(javaDir, { recursive: true });

      // 1. quick_apply_widget_info.xml
      const widgetInfoContent = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="140dp"
    android:minHeight="80dp"
    android:targetCellWidth="2"
    android:targetCellHeight="1"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/quick_apply_widget"
    android:description="@string/widget_description"
    android:widgetCategory="home_screen"
    android:resizeMode="horizontal|vertical">
</appwidget-provider>
`;
      fs.writeFileSync(path.join(xmlDir, 'quick_apply_widget_info.xml'), widgetInfoContent, 'utf-8');

      // 2. quick_apply_widget.xml
      const widgetLayoutContent = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="12dp"
    android:background="@drawable/widget_bg">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginBottom="8dp">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="HireLog"
            android:textColor="#0F172A"
            android:textSize="14sp"
            android:textStyle="bold" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Quick Apply"
            android:textColor="#64748B"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/btn_new_application"
        android:layout_width="match_parent"
        android:layout_height="38dp"
        android:background="@drawable/widget_btn_bg"
        android:gravity="center"
        android:text="+ New Application"
        android:textColor="#FFFFFF"
        android:textSize="13sp"
        android:textStyle="bold" />
</LinearLayout>
`;
      fs.writeFileSync(path.join(layoutDir, 'quick_apply_widget.xml'), widgetLayoutContent, 'utf-8');

      // 3. widget_bg.xml
      const widgetBgContent = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke android:width="1dp" android:color="#CBD5E1" />
    <corners android:radius="16dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'widget_bg.xml'), widgetBgContent, 'utf-8');

      // 4. widget_btn_bg.xml
      const widgetBtnBgContent = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#2563EB" />
    <corners android:radius="8dp" />
</shape>
`;
      fs.writeFileSync(path.join(drawableDir, 'widget_btn_bg.xml'), widgetBtnBgContent, 'utf-8');

      // 5. QuickApplyWidget.kt
      const kotlinProviderContent = `package com.byten.hirelog

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class QuickApplyWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("hirelog://new-application")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val views = RemoteViews(context.packageName, R.layout.quick_apply_widget)
            views.setOnClickPendingIntent(R.id.btn_new_application, pendingIntent)
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
`;
      fs.writeFileSync(path.join(javaDir, 'QuickApplyWidget.kt'), kotlinProviderContent, 'utf-8');

      // 6. Add widget_description string to strings.xml if needed
      const valuesDir = path.join(resDir, 'values');
      const stringsFile = path.join(valuesDir, 'strings.xml');
      if (fs.existsSync(stringsFile)) {
        let stringsContent = fs.readFileSync(stringsFile, 'utf-8');
        if (!stringsContent.includes('widget_description')) {
          stringsContent = stringsContent.replace(
            '</resources>',
            '    <string name="widget_description">Quick Apply entry point for HireLog</string>\n</resources>'
          );
          fs.writeFileSync(stringsFile, stringsContent, 'utf-8');
        }
      }

      return config;
    },
  ]);
};

/**
 * Injects QuickApplyWidget receiver into AndroidManifest.xml
 */
const withWidgetManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) {
      return config;
    }

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    // Check if receiver is already registered
    const receiverExists = mainApplication.receiver.some(
      (r) => r.$?.['android:name'] === '.QuickApplyWidget'
    );

    if (!receiverExists) {
      mainApplication.receiver.push({
        $: {
          'android:name': '.QuickApplyWidget',
          'android:exported': 'true',
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
              'android:resource': '@xml/quick_apply_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });
};

const withAndroidWidget = (config) => {
  config = withWidgetFiles(config);
  config = withWidgetManifest(config);
  return config;
};

module.exports = createRunOncePlugin(withAndroidWidget, PKG_NAME, PKG_VERSION);
