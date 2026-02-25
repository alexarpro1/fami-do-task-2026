# PowerSync Sync Rules – Phase 10 (rewards, reward_redemptions)

Nach dem Anlegen der Tabellen `rewards` und `reward_redemptions` in Supabase müssen diese in den PowerSync Sync Rules ergänzt werden.

## Im PowerSync-Dashboard

1. **PowerSync Cloud:** [dashboard.powersync.com](https://dashboard.powersync.com) → dein Projekt → **Sync Rules**.
2. **Neue Tabellen** `rewards` und `reward_redemptions` in die Sync Rules aufnehmen.

### YAML-Block

Zwei neue Blöcke (oder in einen bestehenden Bucket integrieren):

```yaml
# Belohnungen (Phase 10)
- id: rewards
  bucket:
    data:
      - rewards
  parameters: {}
  where: "true"

# Einlösungen (Kassenbuch)
- id: reward_redemptions
  bucket:
    data:
      - reward_redemptions
  parameters: {}
  where: "true"
```

Oder in einen gemeinsamen Familien-Bucket:

```yaml
- id: family_data
  bucket:
    data:
      - tasks
      - task_completions
      - children
      - rewards
      - reward_redemptions
  parameters:
    user_id: "SELECT auth.uid()"
  where: "true"
```

### Publication in Supabase

Im Skript **scripts/supabase-rewards.sql** sind bereits enthalten:

- `ALTER PUBLICATION powersync ADD TABLE rewards;`
- `ALTER PUBLICATION powersync ADD TABLE reward_redemptions;`

---

**Kurz:** Sync Rules um `rewards` und `reward_redemptions` erweitern, dann funktioniert die Economy (Belohnungen einlösen, Kontostand) auf allen Geräten.