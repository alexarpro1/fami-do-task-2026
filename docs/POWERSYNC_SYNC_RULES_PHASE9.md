# PowerSync Sync Rules – Phase 9 (children)

Nach dem Anlegen der Tabelle `children` in Supabase und im Client-Schema muss PowerSync diese Tabelle synchronisieren.

## Im PowerSync-Dashboard

1. **PowerSync Cloud:** [dashboard.powersync.com](https://dashboard.powersync.com) → dein Projekt → **Sync Rules**.
2. **Neue Tabelle** `children` in die Sync Rules aufnehmen.

### YAML-Block für children

Füge einen Block für `children` hinzu (z. B. unter deinem bestehenden `family_tasks`-Bucket oder als eigener Bucket):

```yaml
# Kinder-Profile (Phase 9)
- id: children
  bucket:
    data:
      - children
  parameters: {}
  where: "true"
```

Oder **in einen bestehenden Bucket** (z. B. wenn ihr einen gemeinsamen Familien-Bucket habt):

```yaml
# Beispiel: family_tasks Bucket um children erweitern
- id: family_tasks
  bucket:
    data:
      - tasks
      - task_completions
      - children
  parameters:
    user_id: "SELECT auth.uid()"
  where: "true"
```

Die Abfrage entspricht effektiv **SELECT * FROM children** (alle Zeilen, die der User laut Filter sehen darf).

### Publication in Supabase

Im SQL-Skript **scripts/supabase-children.sql** ist bereits enthalten:

```sql
ALTER PUBLICATION powersync ADD TABLE children;
```

Falls die Publication noch nicht existiert, zuerst anlegen (siehe Kommentare in den anderen Supabase-Skripten).

---

**Kurz:** Sync Rules um `children` erweitern, Publication um `children` ergänzen – dann erscheinen neue Kinder auf allen Geräten.