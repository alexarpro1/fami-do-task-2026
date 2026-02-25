# PowerSync Sync Rules – Phase 7 (task_completions)

Nach dem Anlegen der Tabelle `task_completions` in Supabase und im Client-Schema muss PowerSync diese Tabelle synchronisieren dürfen.

## Im PowerSync-Dashboard

1. **PowerSync Cloud:** [dashboard.powersync.com](https://dashboard.powersync.com) → dein Projekt → **Sync Rules**.
2. **Neue Tabelle** in die Sync Rules aufnehmen.

### Option A: sync_rules.yaml (Self-Hosted / YAML-basiert)

Füge einen weiteren Block für `task_completions` hinzu (analog zu `tasks`):

```yaml
# Beispiel: Erweiterung um task_completions
- id: task_completions
  bucket:
    data:
      - task_completions
  parameters: {}
  where: "true"
```

Oder falls ihr eine **bucketed**-Struktur mit User-ID nutzt:

```yaml
- id: task_completions
  bucket:
    data:
      - task_completions
  parameters:
    user_id: "SELECT auth.uid()"
  where: "true"
```

(Anpassen an eure bestehende Regel-Struktur; `where: "true"` erlaubt alle Zeilen für den eingeloggten User.)

### Option B: PowerSync Cloud UI

Falls das Dashboard eine **Tabelle hinzufügen**-Option hat:

- Tabelle: **task_completions**
- Spalten: `id`, `created_at`, `task_id`, `child_id`, `points_awarded`
- Filter (falls nötig): gleiche Logik wie bei `tasks` (z. B. nur Zeilen des aktuellen Users/Familie).

### Publication in Supabase

Die Tabelle muss in der **Supabase-Publication** enthalten sein, die PowerSync abonniert:

- Entweder in **scripts/supabase-completions.sql** bereits ausgeführt:  
  `ALTER PUBLICATION powersync ADD TABLE task_completions;`
- Oder manuell im Supabase SQL Editor.

Ohne Eintrag in der Publication liefert Postgres keine Änderungen an `task_completions` an PowerSync.

---

**Kurz:** Sync Rules um `task_completions` erweitern, Publication in Supabase um `task_completions` ergänzen – dann werden Completions und Punkte über alle Geräte hinweg synchron.
