# Beta Features Archive

Dieser Ordner enthält experimentelle Features die für zukünftige Entwicklung zurückgestellt wurden.

## Familien-Sync System (v2.0 BETA)

Status: **Zurückgestellt für zukünftige Entwicklung**

Das Familien-Sync System ermöglicht die Synchronisation von Familiendaten über mehrere Geräte.

### Features:
- Familie erstellen und beitreten via QR-Code
- Automatische Synchronisation über Supabase
- Master/Admin/Child Rollen-System
- Echtzeit-Daten-Sync zwischen Geräten

### Dateien:
- `components/family-sync/` - UI Komponenten
- `lib/family-sync.ts` - Sync-Logik
- `scripts/001-create-family-sync-tables.sql` - Datenbank-Schema
- `scripts/002-improve-sync-schema.sql` - Schema-Verbesserungen

### Warum zurückgestellt?
Die aktuelle Implementierung ist komplex und benötigt weitere Tests und Optimierungen.
Für die stabile Version fokussieren wir uns auf Export/Import via Backup-System.

### Wiederaufnahme:
Dieses Feature wird in einer zukünftigen Version als ausgereiftes Feature zurückkehren.
