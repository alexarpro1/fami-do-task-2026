package com.famiapp.app.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Spinner;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;

public class FamiDoWidgetConfigureActivity extends Activity {

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private Spinner childSpinner;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_widget_configure);

        // Set the result to CANCELED. This will cause the widget host to cancel
        // out of the widget placement if the user presses the back button.
        setResult(RESULT_CANCELED);

        // Find the widget id from the intent.
        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        // If this activity was started with an intent without an app widget ID, finish with an error.
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        childSpinner = findViewById(R.id.child_spinner);
        Button saveButton = findViewById(R.id.btn_save_config);

        // Load children from shared preferences (simplified)
        loadChildren();

        saveButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveConfiguration();
            }
        });
    }

    private void loadChildren() {
        // In a real app, this would load from your app's data
        // For now, we'll use dummy data
        List<String> children = new ArrayList<>();
        children.add("Anna");
        children.add("Max");
        children.add("Lisa");

        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, children);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        childSpinner.setAdapter(adapter);
    }

    private void saveConfiguration() {
        String selectedChild = (String) childSpinner.getSelectedItem();

        // Save the configuration
        SharedPreferences prefs = getSharedPreferences("famido_widget", MODE_PRIVATE);
        prefs.edit().putString("child_" + appWidgetId, selectedChild).apply();

        // Make sure we pass back the original appWidgetId
        Intent resultValue = new Intent();
        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        setResult(RESULT_OK, resultValue);
        finish();

        Toast.makeText(this, "Widget konfiguriert für " + selectedChild, Toast.LENGTH_SHORT).show();
    }
}

