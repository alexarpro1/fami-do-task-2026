# App Widget - FamiDo App

## Übersicht

Das FamiDo App Widget ermöglicht schnelle Zugriffe auf wichtige Features direkt vom Home Screen aus. Es zeigt drei Hauptaktionen: Aufgabe hinzufügen, Stimmung eintragen und Belohnungen ansehen.

## Implementierte Features

### Widget-Layout
- **Größe**: 3x2 Grid-Zellen (250dp x 110dp)
- **Design**: Dunkles Theme mit abgerundeten Ecken
- **3 Buttons**: Aufgabe, Stimmung, Belohnungen
- **Kind-Name Anzeige**: Zeigt konfiguriertes Kind

### Widget-Konfiguration
- **Activity**: `FamiDoWidgetConfigureActivity`
- **Auswahl**: Kind auswählen beim ersten Hinzufügen
- **Speicherung**: SharedPreferences für Widget-Konfiguration

### Interaktionen
- **Aufgabe Button**: Öffnet Tasks-Seite
- **Stimmung Button**: Öffnet Mood-Seite
- **Belohnungen Button**: Öffnet Rewards-Seite

## Datei-Struktur

```
android/app/src/main/
├── java/com/famiapp/app/
│   ├── MainActivity.java (aktualisiert)
│   └── widget/
│       ├── FamiDoWidgetProvider.java
│       └── FamiDoWidgetConfigureActivity.java
├── res/
│   ├── drawable/
│   │   ├── widget_background.xml
│   │   ├── widget_button_bg.xml
│   │   └── widget_preview.xml
│   ├── layout/
│   │   ├── widget_famido.xml
│   │   └── activity_widget_configure.xml
│   └── xml/
│       └── famido_widget_info.xml
└── AndroidManifest.xml (aktualisiert)
```

## Code-Details

### Widget Provider

```java
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
        views.setOnClickPendingIntent(R.id.btn_add_task,
            PendingIntent.getActivity(context, appWidgetId, taskIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        
        // Similar for mood and rewards buttons...
    }
}
```

### Widget-Konfiguration

```java
public class FamiDoWidgetConfigureActivity extends Activity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_widget_configure);
        
        // Load children and set up spinner
        loadChildren();
        
        // Save configuration on button click
        saveButton.setOnClickListener(v -> saveConfiguration());
    }
    
    private void saveConfiguration() {
        String selectedChild = (String) childSpinner.getSelectedItem();
        SharedPreferences prefs = getSharedPreferences("famido_widget", MODE_PRIVATE);
        prefs.edit().putString("child_" + appWidgetId, selectedChild).apply();
    }
}
```

## Installation auf Device

1. **App builden**: `npm run build:mobile`
2. **Android Studio öffnen**
3. **Device verbinden**
4. **App installieren**

### Widget hinzufügen

1. **Home Screen lange drücken**
2. **Widgets auswählen**
3. **FamiDo suchen**
4. **Widget auf Home Screen ziehen**
5. **Kind konfigurieren** (Spinner)
6. **Speichern**

## Android Kompatibilität

- **Minimum**: Android 4.0 (API 14) - Ice Cream Sandwich
- **Target**: Android 12.0+ (API 31+)
- **Getestet auf**: Android 8.0+

## Widget-Info Konfiguration

```xml
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:maxResizeWidth="4"
    android:maxResizeHeight="3"
    android:updatePeriodMillis="86400000"
    android:initialLayout="@layout/widget_famido"
    android:configure="com.famiapp.app.widget.FamiDoWidgetConfigureActivity"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:previewImage="@drawable/widget_preview">
</appwidget-provider>
```

## Zukünftige Verbesserungen

- [ ] Widget-Update basierend auf App-State
- [ ] Mehrere Widgets für verschiedene Kinder
- [ ] Widget-Themes (hell/dunkel)
- [ ] Live-Daten (offene Tasks, aktuelle Stimmung)
- [ ] Widget-Resize-Handling
- [ ] Push Notifications aus Widget
- [ ] Widget-Shortcuts für häufige Tasks

