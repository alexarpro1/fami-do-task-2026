# PowerSync Sync Rules – Phase 12 (rules, rule_applications)

Nach dem Anlegen der Tabellen `rules` und `rule_applications` in Supabase müssen diese in den PowerSync Sync Rules ergänzt werden.

## Im PowerSync-Dashboard

1. **PowerSync Cloud:** [dashboard.powersync.com](https://dashboard.powersync.com) → dein Projekt → **Sync Rules**.
2. **Neue Tabellen** `rules` und `rule_applications` in die Sync Rules aufnehmen.

### YAML-Block

Zwei neue Blöcke (oder in einen bestehenden Bucket integrieren):

```yaml
# Regeln (Phase 12)
- id: rules
  bucket:
    data:
      - rules
  parameters: {}
  where: "true"

# Regel-Anwendungen (Boni/Strafen-Punkte)
- id: rule_applications
  bucket:
    data:
      - rule_applications
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
      - rules
      - rule_applications
  parameters:
    user_id: "SELECT auth.uid()"
  where: "true"
```

### Publication in Supabase

Im Skript **scripts/supabase-rules.sql** sind bereits enthalten:

- `ALTER PUBLICATION powersync ADD TABLE rules;`
- `ALTER PUBLICATION powersync ADD TABLE rule_applications;`

---

**Kurz:** Sync Rules um `rules` und `rule_applications` erweitern, dann ist das Economy-System (Kontostand = Completions − Redemptions + Rule Applications) auf allen Geräten konsistent.
