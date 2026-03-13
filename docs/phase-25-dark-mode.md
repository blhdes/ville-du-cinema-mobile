# Phase 25: Elegant Dark Mode & Dynamic Theming

## Current State

All colors live in `theme/index.ts` and are imported via `@/theme` — a single source of truth. There is no dark mode, no `useColorScheme`, and the `StatusBar` is hardcoded to `"dark"`. Every component already imports colors from one place, so the refactor surface is manageable.

---

## 1. Theme Context & Local Storage

**New file:** `contexts/ThemeContext.tsx`

### State Shape

```
preference: 'system' | 'light' | 'dark'   <- what the user chose
resolved:   'light' | 'dark'              <- what's actually active
```

### How It Works

- On mount, read the saved preference from AsyncStorage (key: `display_theme_preference`). Default to `'system'` if nothing is stored.
- Use React Native's `Appearance.addChangeListener` to detect when the OS switches between light/dark. When `preference === 'system'`, the `resolved` value follows the OS. Otherwise, it's locked to the user's manual choice.
- When the user changes their preference, save it to AsyncStorage immediately (same pattern as `DisplayPreferencesContext` — optimistic update, revert on failure).
- Expose a custom hook `useTheme()` that returns `{ preference, resolved, setPreference, colors }`. The `colors` object is the resolved palette (light or dark) so components don't need to think about which mode they're in.

### Why a Separate Context

Theme affects every component on screen and changes the entire color palette. Display preferences are granular toggles (drop caps, ratings). Keeping them separate means theme changes don't trigger re-renders of unrelated preference consumers, and vice versa.

### AsyncStorage Integration

Uses the existing `lib/storage.ts` abstraction (`getItem` / `setItem`), same as other preferences. No Supabase sync needed — theme preference is device-local only.

---

## 2. Semantic Color Palette Refactoring

**File to modify:** `theme/index.ts`

Instead of one `colors` object, define two palettes that share the same keys:

| Token              | Light (current) | Dark (proposed) | Why                                                                                                     |
| ------------------ | --------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `background`       | `#FCFAF8`       | `#171717`       | Pure black (#000) causes halation on OLED — charcoal is easier on the eyes and feels more editorial     |
| `backgroundSecondary` | `#F2F2F7`    | `#1E1E1E`       | Card surfaces need slight elevation from the base background                                            |
| `foreground`       | `#1C1C1E`       | `#E8E4DF`       | Pure white (#FFF) is harsh — an off-white with a warm tint matches the magazine aesthetic                |
| `secondaryText`    | `#8E8E93`       | `#9A9A9F`       | Slightly brighter than light mode to maintain ~4.5:1 contrast ratio on the dark background              |
| `border`           | `#C6C6C8`       | `#2C2C2E`       | Subtle enough to define edges without glowing                                                           |
| `teal`             | `#2E86AB`       | `#3DA5CC`       | Lightened ~15% to hit WCAG AA (4.5:1) against the dark background. Current teal on #171717 only ~3.8:1 |
| `red`              | `#D7263D`       | `#E5475D`       | Same idea — slight bump for contrast                                                                    |
| `yellow`           | `#F2C14E`       | `#F2C14E`       | Already high-contrast on both backgrounds — no change needed                                            |
| `white`            | `#FFFFFF`       | `#FFFFFF`       | Used for overlays/modals, stays as-is                                                                   |

### Export Structure Change

The current `export const colors = { ... }` becomes an internal `lightColors` and `darkColors`. The `ThemeContext` picks the right one based on `resolved` and passes it through. Components keep importing from `@/theme`, but now via the `useTheme().colors` hook instead of the static object.

### Breaking Change

Components that currently do `import { colors } from '@/theme'` will need to switch to `const { colors } = useTheme()`. This is the bulk of the migration work, but it's mechanical — find-and-replace across ~20-30 files.

### Hardcoded Values to Fix

- `App.tsx`: loading screen `#fdfaf3` -> use `colors.background`
- `ExternalProfileHeader.tsx`: modal overlay `rgba(0, 0, 0, 0.85)` -> stays dark (it's a photo overlay, not themed)
- Drop shadows using `#000000` -> fine on both modes (shadows are always dark)

---

## 3. Settings UI Integration

**File to modify:** `components/settings/DisplaySettings.tsx`

### UI Proposal

A segmented control (3 options: System / Light / Dark) placed at the top of the Display Settings section, since theme is the highest-impact visual preference.

### Implementation Approach

- Use a row of three `Pressable` buttons styled as a pill group (similar to iOS segmented controls). The active segment gets a `colors.teal` background with white text; inactive segments get `colors.backgroundSecondary` with `colors.foreground` text.
- Tapping a segment calls `setPreference()` from `useTheme()`.
- When "System" is selected, show a subtle caption underneath: "Follows your device appearance" in `colors.secondaryText`.

### Why Segmented Control

Three options map cleanly to three segments. A toggle only works for two states, and a dropdown adds an extra tap. Segmented controls are a native iOS/Android pattern users already understand.

---

## 4. Global Component Updates & Navigation

### Component Migration Strategy

Replace the static `colors` import with the `useTheme()` hook. This is a mechanical change:

```typescript
// Before (every component today)
import { colors } from '@/theme';

// After
const { colors } = useTheme();
```

Components don't need any logic changes — they already reference semantic tokens like `colors.foreground` and `colors.background`. Once those tokens resolve to the right palette, everything "just works."

### Migration Order (by impact)

1. `theme/index.ts` — define both palettes
2. `contexts/ThemeContext.tsx` — create the context + hook
3. `App.tsx` — wrap the app in `ThemeProvider`, fix StatusBar
4. `navigation/AppTabs.tsx` — dynamic tab bar colors
5. Screens & components — swap static import for hook (batch job, ~20-30 files)

### React Navigation Integration

**File:** `navigation/AppTabs.tsx` (and wherever `NavigationContainer` lives)

React Navigation accepts a `theme` prop on `NavigationContainer`. Construct it from `useTheme().colors`:

```typescript
{
  dark: resolved === 'dark',
  colors: {
    primary:      colors.teal,
    background:   colors.background,
    card:         colors.background,
    text:         colors.foreground,
    border:       colors.border,
    notification: colors.teal,
  }
}
```

This gives automatic theming of:
- Stack header backgrounds and titles
- Bottom tab bar background
- Modal backgrounds
- Default text colors in navigation headers

### StatusBar

Switch from the hardcoded `<StatusBar style="dark" />` to:

```typescript
<StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
```

Light content on dark background, dark content on light background (yes, it's inverted).

### Tab Bar

The hardcoded colors in `AppTabs.tsx` (`tabBarActiveTintColor`, `tabBarStyle.backgroundColor`, etc.) will be replaced with values from `useTheme().colors`, making the tab bar reactive to theme changes.

---

## File Checklist

| File                                      | Action                                                          |
| ----------------------------------------- | --------------------------------------------------------------- |
| `theme/index.ts`                          | Split into `lightColors` / `darkColors`, export `getColors(mode)` helper |
| `contexts/ThemeContext.tsx`                | **New** — ThemeProvider, useTheme hook                          |
| `App.tsx`                                 | Wrap in ThemeProvider, dynamic StatusBar                        |
| `navigation/AppTabs.tsx`                  | Consume useTheme for tab bar + NavigationContainer theme        |
| `components/settings/DisplaySettings.tsx` | Add segmented theme control                                     |
| ~20-30 component/screen files             | Swap `import { colors }` -> `useTheme().colors`                |

---

## Key Trade-offs

- **Hook vs. static import:** Using `useTheme()` means every color-consuming component becomes a context consumer. This adds slight overhead but is the standard React Native pattern. The alternative (a global reactive variable via Zustand) would avoid the hook, but breaks the existing context-based architecture.
- **Two palettes vs. CSS variables:** React Native doesn't have CSS custom properties. Two palette objects is the idiomatic solution.
- **Not using #000000 for dark background:** Slightly reduces contrast ratio for text, but the warm charcoal (#171717) avoids the "floating text" effect on OLED screens and keeps the editorial feel.
