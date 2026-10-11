# Quick Settings Tiles - FamiDo App

## Übersicht

Quick Settings Tiles ermöglichen schnelle Zugriffe auf wichtige Features der FamiDo-App direkt aus dem Quick Settings Panel (Benachrichtigungsbereich).

## Implementierte Tiles

### 1. **Aufgabe hinzufügen** (Task Tile)
- **Service**: `TaskTileService`
- **Icon**: Checkmark (grün)
- **Funktion**: Öffnet die Tasks-Seite
- **Android Min**: API Level 24 (Android 7.0 Nougat)

### 2. **Stimmung eintragen** (Mood Tile)
- **Service**: `MoodTileService`
- **Icon**: Smiley (orange)
- **Funktion**: Öffnet die Mood-Seite
- **Android Min**: API Level 24 (Android 7.0 Nougat)

### 3. **Belohnungen ansehen** (Rewards Tile)
- **Service**: `RewardsTileService`
- **Icon**: Star (pink)
- **Funktion**: Öffnet die Rewards-Seite
- **Android Min**: API Level 24 (Android 7.0 Nougat)

## Datei-Struktur

```
android/app/src/main/
├── java/com/famiapp/app/
│   ├── MainActivity.java (aktualisiert)
│   └── tiles/
│       ├── MoodTileService.java
│       ├── TaskTileService.java
│       └── RewardsTileService.java
├── res/
│   ├── drawable/
│   │   ├── ic_qs_task.xml
│   │   ├── ic_qs_mood.xml
│   │   └── ic_qs_rewards.xml
│   └── values/
│       └── strings.xml (aktualisiert)
└── AndroidManifest.xml (aktualisiert)
```

## Wie es funktioniert

### Benutzer-Flow

1. Nutzer öffnet das Quick Settings Panel (oben herunterziehen)
2. Sucht nach "FamiDo" Tiles
3. Klickt auf eine Kachel (z.B. "Stimmung eintragen")
4. App öffnet direkt die entsprechende Seite

### Technischer Flow

1. User klickt auf Quick Settings Tile
2. Entsprechender `TileService.onClick()` wird aufgerufen
3. Intent mit `tile=<name>` wird an `MainActivity` gesendet
4. `MainActivity.handleIntentAction()` verarbeitet den Intent
5. Web-App wird zum entsprechenden Route navigiert

## Code-Details

### TileService Implementation

```java
@RequiresApi(api = Build.VERSION_CODES.N)
public class MoodTileService extends TileService {
    
    @Override
    public void onClick() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("tile", "mood");
        startActivity(intent);
        updateTile();
    }
    
    private void updateTile() {
        Tile tile = getQsTile();
        tile.setState(Tile.STATE_ACTIVE);
        tile.setLabel("Stimmung");
        tile.updateTile();
    }
}
```

### MainActivity Intent-Handling

```java
private void handleIntentAction(Intent intent) {
    String tile = intent.getStringExtra("tile");
    if (tile != null) {
        route = getRouteFromTile(tile);
        getBridge().eval("javascript:window.location.href = '/" + route + "';", null);
    }
}
```

## Installation auf Device

1. Projekt builden: `npm run build:mobile`
2. Android Studio öffnen
3. Device mit App verbinden
4. App installieren und starten

### Quick Settings Tiles aktivieren

1. Auf Device: Quick Settings Panel öffnen
2. "Edit" oder "Bearbeiten" tippen
3. Nach "FamiDo" Tiles suchen
4. Gewünschte Tiles hinzufügen

## Permissions

Einzige benötigte Permission:
```xml
<uses-permission android:name="android.permission.BIND_QUICK_SETTINGS_TILE" />
```

Diese wird automatisch in `AndroidManifest.xml` definiert.

## Android Kompatibilität

- **Minimum**: Android 7.0 (API 24) - Nougat
- **Target**: Android 12.0+ (API 31+)
- **Getestet auf**: Android 8.0+

## Zukünftige Verbesserungen

- [ ] Tile-State basierend auf App-State aktualisieren
- [ ] Long-Press für zusätzliche Optionen
- [ ] Tile-Customization Settings
- [ ] Push Notifications aus Tiles
- [ ] Widget für Home Screen

