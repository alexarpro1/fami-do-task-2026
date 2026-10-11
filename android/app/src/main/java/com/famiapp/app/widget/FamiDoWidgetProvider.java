package com.famiapp.app.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import com.famiapp.app.MainActivity;

public class FamiDoWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_famido);

        // Set up click listeners for buttons
        Intent taskIntent = new Intent(context, MainActivity.class);
        taskIntent.putExtra("widget", "task");
        taskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_add_task,
            PendingIntent.getActivity(context, appWidgetId, taskIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent moodIntent = new Intent(context, MainActivity.class);
        moodIntent.putExtra("widget", "mood");
        moodIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_add_mood,
            PendingIntent.getActivity(context, appWidgetId, moodIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent rewardsIntent = new Intent(context, MainActivity.class);
        rewardsIntent.putExtra("widget", "rewards");
        rewardsIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(R.id.btn_view_rewards,
            PendingIntent.getActivity(context, appWidgetId, rewardsIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}

