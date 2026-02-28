# Supabase einrichten (FdT-app-db)

Die `.env.local` ist bereits angelegt. Für einen funktionierenden Cloud-Sync musst du im **Supabase Dashboard** noch Folgendes erledigen.

## 1. Anonymous Auth aktivieren

- Supabase Dashboard → **Authentication** → **Providers**
- **Anonymous** auswählen → **Enable** aktivieren → Speichern

Die App nutzt `signInAnonymously()` und setzt `user_metadata.sync_id` für RLS.

## 2. SQL-Skripte ausführen (Reihenfolge einhalten)

Im Dashboard: **SQL Editor** → New Query. Jeweils das komplette Skript einfügen und **Run** ausführen.

1. **Zuerst:** `scripts/supabase-create-all-tables.sql`  
   Legt Tabellen an: `devices`, `children`, `tasks`, `task_completions`, `rewards`, `reward_redemptions`, `rules`, `rule_applications` inkl. RLS.

2. **Danach:** `scripts/supabase-push-backup-rpc.sql`  
   Erstellt die RPC-Funktion `push_backup_data` für Backup-Import.

3. **Zum Schluss:** `scripts/002-sync-v2-table.sql`  
   Legt die Tabelle `sync_v2` an (family_code, device_id, payload).

## 3. Realtime (optional)

Database → **Realtime** → für die Tabellen aktivieren, die Live-Updates brauchen.

## 4. Dev-Server neu starten

Nach dem Anlegen von `.env.local`:

```bash
npm run dev
```

Damit ist Supabase konfiguriert und die App verbindet sich mit dem Projekt **FdT-app-db**.
