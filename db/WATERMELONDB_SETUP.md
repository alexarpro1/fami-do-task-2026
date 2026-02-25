# WatermelonDB Setup für Expo (Phase 1)

**Kurze Liste – NPM & Babel (Expo mit Custom Dev Client):**

| Was | Befehl / Eintrag |
|-----|------------------|
| **NPM** | `npx expo install @nozbe/watermelondb @nozbe/with-observables` |
| **NPM (Dev)** | `npm install --save-dev @babel/plugin-proposal-decorators` |
| **Babel-Plugin** | `["@babel/plugin-proposal-decorators", { legacy: true }]` in `babel.config.js` unter `plugins` |

---

Diese Anleitung gilt für dein **Expo-Projekt** (nicht für die reine Next.js-Web-App).  
WatermelonDB benötigt native Module (SQLite) und läuft **nicht** in Expo Go – du brauchst einen **Development Build** (`npx expo run:ios` / `npx expo run:android`).

---

## 1. NPM-Pakete installieren

Im **Expo-Projekt-Root** (dort, wo `app.json` / `package.json` liegt):

```bash
npx expo install @nozbe/watermelondb @nozbe/with-observables
npm install --save-dev @babel/plugin-proposal-decorators
```

- **@nozbe/watermelondb** – Datenbank + Schema + Models  
- **@nozbe/with-observables** – React-Integration (Observables → Komponenten-Updates)  
- **@babel/plugin-proposal-decorators** – erforderlich für die `@field`, `@date`, `@table` Decorators

---

## 2. Babel-Konfiguration

**babel.config.js** (oder **babel.config.ts**):

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      "babel-preset-expo",
      // Wichtig: Decorators VOR dem TypeScript-Preset
    ],
    plugins: [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      // Falls du react-native-reanimated nutzt: 'react-native-reanimated/plugin' als letztes
    ],
  }
}
```

Falls du ein **TypeScript-Preset** explizit nutzt, muss der Decorator-Plugin **vor** dem TS-Preset stehen (bei Expo ist das meist schon über `babel-preset-expo` abgedeckt).

---

## 3. Datenbank initialisieren (im Expo-Projekt)

Erstelle z. B. **db/index.ts** (oder nutze die bestehende **db/**-Struktur aus diesem Repo):

- **schema** aus `db/schema.ts` importieren  
- **Models** (Task, ActionQueueItem) registrieren  
- **Database**-Instanz mit SQLite-Adapter erstellen

Beispiel (Pfade ggf. anpassen):

```ts
import { Database } from "@nozbe/watermelondb"
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite"
import { schema } from "./schema"
import { Task } from "./models/Task"
import { ActionQueueItem } from "./models/ActionQueueItem"

const adapter = new SQLiteAdapter({
  schema,
  // optional: jsi: true für bessere Performance (React Native)
})

export const database = new Database({
  adapter,
  modelClasses: [Task, ActionQueueItem],
})
```

---

## 4. Wo die Dateien liegen (dieses Repo)

- **db/schema.ts** – Schema für `tasks` und `action_queue`  
- **db/models/Task.ts** – Model-Klasse Task (SyncableTask)  
- **db/models/ActionQueueItem.ts** – Model-Klasse ActionQueueItem  
- **db/models/index.ts** – Re-Export der Models  

Diese Dateien kannst du 1:1 in dein Expo-Projekt kopieren (oder per Monorepo verlinken). Die Imports in den Models verweisen auf `../../types` bzw. `../../types/offline-first` – die **types** müssen im Expo-Projekt an gleicher relativer Stelle existieren (oder du passt die Pfade an).

---

## 5. Wichtig: Kein Expo Go

- **Expo Go** unterstützt die nativen WatermelonDB/SQLite-Module **nicht**.  
- Nutze einen **Custom Dev Client**:  
  `npx expo run:ios` bzw. `npx expo run:android`  
- Danach läuft die App mit echtem SQLite und du kannst Tasks und die Action Queue lokal speichern.

---

## 6. Kurz-Checkliste

| Schritt | Erledigt |
|--------|----------|
| `@nozbe/watermelondb` + `@nozbe/with-observables` installiert | ☐ |
| `@babel/plugin-proposal-decorators` installiert | ☐ |
| Babel-Plugin `["@babel/plugin-proposal-decorators", { legacy: true }]` in babel.config.js | ☐ |
| Schema + Models (db/) ins Expo-Projekt übernommen | ☐ |
| Database mit SQLiteAdapter erstellt und Model-Klassen registriert | ☐ |
| App mit `npx expo run:ios` / `run:android` gebaut (kein Expo Go) | ☐ |
