# AGENTS.md – AI Coding Agent Guidelines

## Quick Start for AI Agents

**Project:** FamiApp – Family task/reward management app for children with cloud sync & Android APK support.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Capacitor 6 (Android) + Supabase (optional)

**Key Constraint:** App runs **fully offline** without Supabase; cloud features are optional enhancements.

---

## 1. Architecture Overview

### Big Picture: Three Execution Contexts

The app runs in **three different environments** with different sync & storage strategies:

1. **Browser (PWA)**: localStorage → Next.js static export → installable via "Add to Home Screen"
2. **Native Android (Capacitor)**: Preferences API → identical Next.js UI → APK distribution
3. **Family Sync Layer**: Device-to-device sync via QR codes (local Supabase tokens) or WLAN (P2P/Polling)

**Why this matters:** When adding features, always consider: *Does this need offline support? Does this sync across devices?*

### State Management: Context + Persistent Storage

- **`family-context.tsx`** (1060 lines): Single global `FamilyState` reducer managing all app data
  - Contains: children, tasks, rewards, rules, achievements, mood, streaks, pet, points, settings
  - Synced to localStorage/Preferences automatically
  - **Pattern:** Actions → Reducer → localStorage → UI
- **`persistent-state.ts`**: Abstraction layer detecting native (Capacitor) vs browser environment
  - Fallback: localStorage if Preferences unavailable

**Critical pattern:** Always dispatch actions to the context; never directly mutate state or localStorage. The context is **the single source of truth**.

### Data Layer: PowerSync + Supabase (Optional)

- **`PowerSyncProvider.tsx`** + **`lib/db/setup`**: PowerSync instance for reactive database
- **`schema.ts`**: WatermelonDB schema (tasks table, action_queue table)
- **`lib/supabase-sync.ts`**: Backup/restore logic from Supabase
- **Supabase Tables** (via SQL migrations in `scripts/`):
  - `families`, `family_members`, `sync_devices`, `sync_tokens`, `app_state_backups`
- **Key insight:** PowerSync is **optional** – app works fully without it. Only enable for advanced cloud features.

---

## 2. Critical Developer Workflows

### Version Management (Automated)

**Every build automatically increments the build number.** This is crucial:

```bash
npm run build          # Increments build: 2.6.0.47 → 2.6.0.48
npm run export         # Same as build
npm run mobile:build   # Build + copy assets + sync Capacitor
npm run version:bump   # Manual increment (rarely needed)
npm run version:update # Bump + create versioned backup (recommended)
```

**Files involved:**
- `version.json`: Source of truth (read by scripts)
- `lib/version.ts`: Displayed in app footer
- `public/version.json`: For update-check RPC

**DO NOT manually edit version numbers in multiple places** – the build script handles it. If you need a major.minor.patch change, edit `version.json` once, then `npm run build`.

### Android APK Build Pipeline

```bash
npm run mobile:build                # Recommended: web export + cap sync + Android open
# OR step-by-step:
npm run export                      # Create static Next.js export in out/
npm run cap:icons                   # Update app icons from logo
npx cap sync                        # Copy out/ to android/app/src/main/assets/public/
npm run android:open                # Opens Android Studio (runs clean first)
# In Android Studio: Build → Build APK(s)
```

**Windows-specific issue:** "Unable to delete directory" errors when Android Studio holds files. Solution: Close Android Studio, terminals, and file explorers in the android/ directory before building.

**Batch script available:** `build-apk.bat` (double-click) runs the full pipeline and outputs versioned APK to `android/app/build/outputs/apk/V{version}/`.

### Development Server

```bash
npm run dev            # Start Next.js dev server on http://localhost:3000
npm run dev:clean      # Clean .next/ and restart (if weird builds)
npm run lint           # ESLint (currently ignoring most errors in next.config)
```

---

## 3. Project-Specific Patterns & Conventions

### Component Structure

**Location matters:**
- **`components/ui/`**: Shadcn/radix-ui primitive components (modal, button, input, etc.)
- **`components/{feature}/`**: Feature-specific components (e.g., `components/task/`, `components/child/`)
- **`components/dashboard/`, `components/admin/`**: Page-level container components
- **`app/`**: Next.js App Router pages (no longer pages/ directory)

**Naming patterns:**
- Hook files: `use*.ts` (e.g., `useWlanSync.ts`)
- Context files: `*-context.tsx`
- Component files: `CamelCase.tsx`
- Types files: `index.ts` or feature-named in `types/`

### Styling: Tailwind CSS 4 + CSS Variables

- **Tailwind 4** with custom color variables in `globals.css`
- Theme colors defined in `components/theme-provider.tsx` (8 themes: default, dark, colorful, etc.)
- **No CSS modules** – use Tailwind utility classes or inline styles
- **Important:** `next.config.mjs` sets `output: 'export'` for static generation (required for Capacitor)

### i18n: Multi-Language Support

- **Languages:** DE, EN, ES, FR, TR, AR
- **Location:** `env/i18n/` directory
- **Pattern:** `useTranslation()` hook imported from `lib/i18n.ts`
- **Key function:** `normalizeStoredLanguage()` handles legacy language code migration

### Mobile Safeguards

- **`components/mobile-safe-area.tsx`**: Wraps content for notch/safe area handling
- **`components/error-boundary.tsx`**: Catches rendering errors gracefully
- **Keyboard handling:** `@capacitor/keyboard` integration for Android software keyboard

---

## 4. Data Sync & Storage Patterns

### Local-First Sync Strategy

1. **User action** → Dispatch context action
2. **Context reducer** updates state immediately (optimistic)
3. **Reducer triggers** localStorage/Preferences save (debounced, 2s)
4. **If Supabase enabled:** Action queued to `action_queue` table
5. **Sync service** periodically processes queue and pushes to cloud

**Important:** Never wait for cloud sync to complete before updating UI. Use optimistic updates.

### Device ID & Family Codes

- **Device ID:** Stored in localStorage as `famiapp-device-id`, generated once on first run
- **Family Code:** 8-character code (e.g., `ABC2D5XY`) for QR-based pairing
- **Pattern:** `generateFamilyCode()` and `getDeviceId()` functions in `family-sync.ts`

### QR Code Sync (Token-Based)

- Parent generates QR code → child scans with camera
- QR contains short-lived Supabase token + family_id
- Child registers as family member in `family_members` table
- Bidirectional state sync begins via Supabase polling

**Files:** `components/family-sync/QrScanner.tsx`, `lib/family-sync.ts`

### WLAN Sync (Two Modes)

1. **Cloud Mode (Default):** Uses Supabase polling (2-second intervals)
2. **Direct Mode:** Peer-to-peer via PeerJS (if Supabase unavailable)

**Files:** `hooks/useWlanSync.ts`, `lib/sync-v2/adapters/`

---

## 5. Type System & Data Structures

### Core Types (in `types/index.ts`)

```typescript
type FamilyState = {
  children: Child[]
  tasks: Task[]
  rewards: Reward[]
  rules: Rule[]
  mood: MoodEntry[]
  // ... plus achievements, streaks, pet, points
}

type Task = {
  id: string
  title: string
  emoji: string
  points: number
  category: 'morning' | 'school' | 'evening' | etc.
  days: ('mon' | 'tue' | ... )[]
  isActive: boolean
  duration?: number // minutes
  startTime?: string // HH:MM
  endTime?: string   // HH:MM
  timerOptions?: { ... }
  // ... created_at, updated_at, isDeleted
}
```

**Pattern:** Most entities have `created_at`, `updated_at`, and `isDeleted` (for soft deletes). Never delete data – mark `isDeleted: true` for sync consistency.

### Action Types

All state changes dispatch `FamilyAction` to `family-context.tsx`:

```typescript
type FamilyAction =
  | { type: 'ADD_CHILD'; payload: Child }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string } // id
  // ... 50+ action types
```

**Rule:** Always dispatch actions; never mutate state directly.

---

## 6. Integration Points & External Dependencies

### Capacitor (Android Runtime)

**Key plugins used:**
- `@capacitor/preferences`: Native persistent storage (replaces localStorage on Android)
- `@capacitor/app`: App lifecycle (minimize, resume events)
- `@capacitor/device`: Device info (for device-id generation)
- `@capacitor/local-notifications`: Background reminders
- `@capacitor/share`: Share state/backups via intent
- `@capacitor/filesystem`: File I/O for backups

**Pattern:** Always use graceful fallbacks. Example:
```typescript
async function saveState() {
  try {
    const prefs = await Preferences.get({ key: STORAGE_KEY })
  } catch {
    const stored = localStorage.getItem(STORAGE_KEY) // fallback
  }
}
```

### Supabase (Optional Cloud Layer)

**Created via:** `lib/supabase/client.ts` using `@supabase/supabase-js`

**Environment variables (optional):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**If missing:** App continues with full offline functionality. No warnings to user.

**Tables populated via:** `scripts/supabase-create-all-tables.sql` (run once per Supabase project)

### Analytics & Updates

- **Vercel Analytics:** `@vercel/analytics` (minimal tracking)
- **Update Check:** Polls `public/version.json` every 24 hours; notifies user of available updates
- **Google Drive Backup:** Optional backup location (link in `lib/version.ts` as `APP_UPDATE_DOWNLOAD_URL`)

---

## 7. Common Edits & Where to Make Them

### Adding a New Task Category

1. **`types/index.ts`**: Update `Task['category']` union type
2. **`lib/constants.ts`**: Add task definition to `DEFAULT_MORNING_TASKS` / `DEFAULT_EVENING_TASKS`
3. **`components/task/`**: Update task creation/edit forms if new fields needed
4. **`context/family-context.tsx`**: Update type annotation for Task

### Adding a New Setting

1. **`types/index.ts`**: Add to `AppSettings` interface
2. **`lib/constants.ts`**: Add `DEFAULT_SETTINGS` entry
3. **`context/family-context.tsx`**: Handle in reducer actions (SET_SETTING, etc.)
4. **`components/settings/`**: Add UI control (toggle, select, etc.)

### Adding a New Sync Feature

1. **`types/sync.ts`**: Define new action types
2. **`lib/family-sync.ts`** or **`lib/sync-v2/`**: Add sync logic
3. **`context/family-context.tsx`**: Trigger sync on state change
4. **Test offline first:** Disable Supabase, verify local sync works

---

## 8. Testing & Debugging

### Browser DevTools

- **localStorage inspection:** DevTools → Application → Local Storage
- **Network:** DevTools → Network tab shows Supabase/PeerJS calls
- **Console:** Check for `[FdT]` prefixed logs (project convention)

### Android Testing

```bash
npm run android:pixel9    # Run on Pixel 9 emulator (if configured)
npm run android:list      # List available devices
npx cap run android       # Build + deploy to connected device/emulator
```

### Local Sync Testing (WLAN)

1. Start two instances: one in browser, one in Android emulator
2. Click "Sync via WLAN" in admin settings
3. Devices discover each other via Supabase or PeerJS
4. Change data in one → should appear in the other within 2 seconds

---

## 9. Emergency Procedures

### State Corruption or Sync Broken

1. **Browser:** Clear localStorage: `localStorage.clear()` in console, reload
2. **Android:** Admin Panel → Settings → "Clear All Data" → reinstall app
3. **Recovery:** Google Drive Backup → Restore (if available)

### "Unable to Delete Directory" Build Errors

1. Close Android Studio completely
2. Kill all npm/terminal processes in android/ folder
3. Run: `cd android && gradlew.bat --stop && gradlew.bat clean && cd ..`
4. Retry: `npm run mobile:build`

### Supabase Connection Issues

- **Check:** Environment variables in `.env.local`
- **Fallback:** App auto-disables Supabase if unreachable; full offline mode
- **Verify:** Check Supabase project tables exist (run `supabase-create-all-tables.sql` once per project)

---

## 10. Performance Considerations

- **Bundle size:** Currently large (~2-3 MB uncompressed) due to radix-ui + all languages
- **Code splitting:** Not yet implemented; could help on slow networks
- **Image optimization:** `next.config.mjs` has `unoptimized: true` for Capacitor compatibility
- **Sync debounce:** 2 seconds before saving to localStorage/cloud (balance: responsiveness vs battery)
- **PowerSync:** Disabled by default; enable only for advanced features requiring reactive SQLite queries

---

## 11. Branching Strategy & Conventions

- **Main branch:** Always stable, APK-buildable
- **Development:** Work on feature branches; test locally before merge
- **Commit message convention:** `[feature|fix|docs|refactor]: Brief description`
- **Example:** `[feature]: Add pet evolution system` or `[fix]: Correct timezone in mood tracking`

---

## 12. For New Agents: First Actions

When you join this codebase:

1. **Read:** `PROJECT_PLAN.md` (feature roadmap) + `DOCUMENTATION.md` (workflows)
2. **Explore:** `context/family-context.tsx` (state structure) + `types/index.ts` (data schema)
3. **Build locally:** `npm install && npm run dev`, verify http://localhost:3000 loads
4. **Test offline:** Disable Supabase (delete .env.local), verify all features work
5. **Make a small change:** Edit a task category or reward item, verify it persists across reload

---

**Last Updated:** 2026-03-11 | Version: 2.6.0.47+

