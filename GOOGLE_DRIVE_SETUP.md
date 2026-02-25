# Google Drive Integration Setup

Um Google Drive mit FamiDo zu verbinden, musst du die **Redirect-URI** in der Google Cloud Console konfigurieren.

## Schritt-für-Schritt Anleitung:

### 1. Google Cloud Console öffnen
- Gehe zu: https://console.cloud.google.com/
- Wähle dein Projekt aus (oder erstelle ein neues)

### 2. OAuth-Zustimmungsbildschirm konfigurieren
- Navigation: **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**
- Wähle **Extern** als Nutzertyp
- Fülle die erforderlichen Felder aus:
  - App-Name: **FamiDo**
  - E-Mail-Adresse für Nutzersupport
  - Entwickler-Kontaktinformationen

### 3. OAuth 2.0-Client-ID erstellen
- Navigation: **APIs & Dienste** → **Anmeldedaten**
- Klicke auf **+ ANMELDEDATEN ERSTELLEN**
- Wähle **OAuth-Client-ID**
- Anwendungstyp: **Webanwendung**

### 4. Autorisierte JavaScript-Ursprünge hinzufügen

**Für lokale Entwicklung / Preview:**
```
http://localhost:3000
```

**Für deine eigene Domain (später):**
```
https://deine-domain.com
```

### 5. Autorisierte Weiterleitungs-URIs hinzufügen

**Für lokale Entwicklung / Preview:**
```
http://localhost:3000/admin
```

**Für deine eigene Domain (später):**
```
https://deine-domain.com/admin
```

### 6. Client-ID kopieren
- Nachdem du die OAuth-Client-ID erstellt hast
- Kopiere die **Client-ID**
- Füge sie als Umgebungsvariable hinzu:
  - Name: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - Wert: `[DEINE_CLIENT_ID]`

### 7. Google Drive API aktivieren
- Navigation: **APIs & Dienste** → **Bibliothek**
- Suche nach: **Google Drive API**
- Klicke auf **AKTIVIEREN**

## Wichtig!

⚠️ Die Redirect-URI muss **EXAKT** übereinstimmen:
- Achte auf `https://` (nicht `http://`)
- Achte auf die korrekte Domain
- Achte auf den Pfad `/admin`

## Fehler 400: redirect_uri_mismatch

Dieser Fehler bedeutet:
- Die Redirect-URI in deiner App stimmt nicht mit der in der Google Cloud Console überein
- Überprüfe beide URIs und stelle sicher, dass sie **identisch** sind
- Nach Änderungen in der Cloud Console kann es 1-2 Minuten dauern bis sie wirksam werden

## Test

1. Gehe zu **Admin Panel** → **Einstellungen** → **Synchronisierung**
2. Klicke auf **Cloud-Sync** → **Konto hinzufügen** → **Google Drive**
3. Es sollte sich ein Google-Anmeldefenster öffnen
4. Wähle dein Google-Konto aus
5. Erlaube den Zugriff auf Google Drive
6. Du wirst zurück zur Admin-Seite geleitet und das Konto ist verbunden

## Support

Bei Problemen:
- Überprüfe die Browser-Konsole auf Fehlermeldungen
- Stelle sicher dass die Client-ID korrekt ist
- Stelle sicher dass die Redirect-URIs übereinstimmen
```

```json file="" isHidden
