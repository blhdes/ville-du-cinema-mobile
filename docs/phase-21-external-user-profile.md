# Phase 21: External User Profile — Architectural Blueprint

## Overview

Replace the current "tap username → open Letterboxd in browser" behavior with a native **ExternalUserProfile** screen. This screen shows a magazine-style author bio header followed by the user's review/watch activity, all rendered with our existing components.

---

## 1. Navigation & Routing

**Problem:** Our current nav structure is flat — `AppTabs > FeedDrawer > FeedMain`. There's no stack to *push* a new screen on top of the Feed tab.

**Solution:** Wrap the Feed tab in a **Native Stack Navigator** so we can push the profile screen on top without leaving the tab.

### New Type: `FeedStackParamList`

```typescript
// navigation/types.ts
FeedStackParamList = {
  FeedDrawer: undefined
  ExternalProfile: { username: string }
}
```

### File Changes

| File | Action |
|---|---|
| `navigation/types.ts` | Add `FeedStackParamList` with the two routes above |
| `navigation/FeedStackNavigator.tsx` | **New file** — a `createNativeStackNavigator` wrapping `FeedDrawerNavigator` + `ExternalProfileScreen` |
| `navigation/AppTabs.tsx` | Change the Feed tab's `component` from `FeedDrawerNavigator` → `FeedStackNavigator` |
| `components/UserListPanel.tsx` | Replace `Linking.openURL(...)` with `navigation.navigate('ExternalProfile', { username })` |
| `components/ReviewCard.tsx` | Same replacement for the author name tap in the meta row |

### Why a Stack Inside the Tab?

This lets the user tap a username, see the profile, and tap `< Back` to return to the feed — standard iOS push/pop behavior. The drawer still works normally inside the stack.

---

## 2. Hybrid Data Fetching Strategy

We need two things Letterboxd doesn't offer via API: **profile metadata** (bio, website) and **activity feed** (reviews/watches, which we already get via RSS).

### New Service: `services/externalProfile.ts`

This file handles scraping the profile page HTML for metadata we can't get from RSS.

```
[File Path]                  → [Action]
services/externalProfile.ts  → New file (profile scraping service)
services/feed.ts             → Export fetchUserFeed (currently not exported)
```

### Data Flow

```
ExternalProfileScreen mounts
  ├─ fetchUserFeed(username)            ← reuse existing (RSS reviews + avatar)
  └─ fetchExternalProfileMeta(username) ← NEW (scrape profile page HTML)
       ├─ Avatar URL (already handled by fetchAvatarUrl)
       ├─ Bio text (from <meta name="description"> or .body-text)
       └─ Display name (from <title> or dc:creator in RSS)
```

### Scraping Targets

From `letterboxd.com/{username}/`:

| Data Point | Extraction Method |
|---|---|
| **Bio** | Regex or DOM parse the `<div class="body-text -bio">` block. Fallback: `<meta name="description" content="...">` tag |
| **Display Name** | Already available from RSS `dc:creator`. The `<title>` tag also contains it: `"Name's profile • Letterboxd"` |
| **Avatar** | Already handled by `fetchAvatarUrl()` in `feed.ts` — reuse directly |
| **Website/links** | Optional stretch goal: parse `<a class="icon-link">` elements from the profile sidebar |

### Return Type

```typescript
interface ExternalProfileMeta {
  displayName: string
  bio: string          // empty string if none found
  websiteUrl?: string  // optional, scraped from profile sidebar
}
```

### Loading & Error States

| State | Behavior |
|---|---|
| **Both loading** | Show `Spinner` centered (same pattern as `ProfileScreen`) |
| **Meta fails, feed succeeds** | Show username as heading, skip bio, render feed normally |
| **Feed fails, meta succeeds** | Show profile header with "No activity yet" empty state |
| **Both fail** | Show `ErrorBanner` with retry button + fallback "View on Letterboxd" link |
| **Bio is empty** | Simply omit the bio text — no placeholder needed (matches `ProfileHeader` pattern) |

---

## 3. UI/UX Layout (Editorial Style)

### Screen: `screens/ExternalProfileScreen.tsx`

One `FlatList` with a `ListHeaderComponent` for the profile header — this gives us free scroll performance and avoids nesting a FlatList inside a ScrollView.

### Profile Header Wireframe

Think of the pull-quote author bios you see in literary magazines:

```
┌─────────────────────────────────────┐
│  ← Back                            │   ← Native stack header
├─────────────────────────────────────┤
│                                     │
│         ┌──────────┐                │
│         │  Avatar   │                │   72px circle (same as ProfileHeader)
│         │  (Image)  │                │
│         └──────────┘                │
│                                     │
│       Display Name                  │   PlayfairDisplay_700Bold, magazineTitle
│       @USERNAME                     │   EBGaramond, magazineMeta (uppercase, tracked)
│                                     │
│  "A short bio scraped from their    │   EBGaramond_400Regular_Italic
│   Letterboxd profile page."         │   Centered, max 3 lines
│                                     │
│      ── View on Letterboxd ──       │   Teal link, centered, subtle
│                                     │
│─────────────────────────────────────│   Hairline divider
│                                     │
│  [ReviewCard / WatchNotification]   │   Reused as-is
│  [ReviewCard / WatchNotification]   │
│  ...                                │
└─────────────────────────────────────┘
```

### Key Design Decisions

- **Centered layout** for the header (unlike our own `ProfileHeader` which is left-aligned with a row). This creates visual distinction — *their* profile feels like an "about the author" card, while *your* profile feels like account settings.
- **Avatar centered above the name** instead of side-by-side. More editorial, less utilitarian.
- **Bio in italic serif** (`bodyItalic` / `EBGaramond_400Regular_Italic`) — matches the pull-quote convention in print magazines.
- **"View on Letterboxd"** link as a subtle escape hatch to the full web profile.

### Component Reuse for the Activity Feed

| Component | Reuse? | Notes |
|---|---|---|
| `ReviewCard` | Yes, as-is | Already accepts a `Review` object and respects `showRatings` + `useDropCap` from `DisplayPreferencesContext` |
| `WatchNotification` | Yes, as-is | Already accepts a `Review` object and reads `showRatings` preference |
| `Spinner` | Yes | Loading state |
| `ErrorBanner` | Yes | Error state |

The existing components already read display preferences from context — no prop threading needed.

### Author Name Tap Behavior on This Screen

The author name tap inside `ReviewCard` and `WatchNotification` should be **disabled or hidden** on the `ExternalProfileScreen` (since you're already on that user's profile). Two options:

- **Option A (recommended):** Add an optional `hideAuthor?: boolean` prop to both components. When true, skip rendering the username in the meta line.
- **Option B:** Leave as-is; tapping the name is a no-op since it would navigate to the same screen. Less clean but zero changes.

---

## 4. Caching & Performance

### Avatar Caching (Already Solved)

The `avatarCache` service already handles this. When `fetchUserFeed(username)` runs, it calls `fetchAvatarUrl(username)`, which checks the in-memory cache → AsyncStorage → network scrape. No changes needed.

### Feed & Profile Caching (New)

Add a lightweight in-memory cache for scraped profile data in `externalProfile.ts`:

```typescript
profileCache: Map<string, { meta: ExternalProfileMeta; fetchedAt: number }>
```

**Why in-memory only (not AsyncStorage)?**

- Profile data changes frequently (bio edits, new reviews)
- The cache only needs to survive within a session (e.g., tap into profile → go back → tap again)
- A 5-minute TTL keeps it fresh enough
- AsyncStorage persistence would add complexity for minimal gain

**Feed data caching:** The RSS results from `fetchUserFeed` can also be held in a simple `Map<string, { reviews: Review[]; fetchedAt: number }>`. Same 5-minute TTL. This makes the back-then-forward navigation feel instant.

**Pull-to-refresh:** The `FlatList`'s `onRefresh` bypasses the cache and re-fetches both the meta and RSS feed.

---

## 5. New Files Summary

| File | Purpose |
|---|---|
| `services/externalProfile.ts` | `fetchExternalProfileMeta()` — scrape bio, display name, website from profile HTML. In-memory cache with TTL. |
| `screens/ExternalProfileScreen.tsx` | New screen — FlatList with profile header + review/watch list |
| `components/profile/ExternalProfileHeader.tsx` | Centered author-bio-style header (avatar, name, bio, Letterboxd link) |
| `navigation/FeedStackNavigator.tsx` | Native stack wrapping the drawer + external profile route |

---

## 6. Complete Data Flow Diagram

```
User taps username (UserListPanel or ReviewCard)
  │
  ▼
navigation.navigate('ExternalProfile', { username: 'sean' })
  │
  ▼
ExternalProfileScreen mounts
  │
  ├──► fetchExternalProfileMeta('sean')
  │     │ Check in-memory cache (< 5 min old?) → hit → return cached
  │     │ Miss → fetch('https://letterboxd.com/sean/')
  │     │       → parse HTML for bio, display name, website
  │     │       → store in memory cache
  │     └──► returns { displayName, bio, websiteUrl? }
  │
  ├──► fetchUserFeed('sean')  (exported from feed.ts)
  │     │ Fetches RSS + avatar in parallel (avatar uses avatarCache)
  │     └──► returns Review[]
  │
  ▼
Render:
  ExternalProfileHeader  ← meta + avatarUrl from avatarCache
  FlatList items          ← Review[] mapped to ReviewCard | WatchNotification
```

---

## 7. Existing Files Modified

| File | Change |
|---|---|
| `navigation/types.ts` | Add `FeedStackParamList` |
| `navigation/AppTabs.tsx` | Swap `FeedDrawerNavigator` → `FeedStackNavigator` for Feed tab |
| `services/feed.ts` | Export `fetchUserFeed` (add `export` keyword) |
| `components/UserListPanel.tsx` | Replace `Linking.openURL` with stack navigation |
| `components/ReviewCard.tsx` | Replace author `Linking.openURL` with stack navigation; add optional `hideAuthor` prop |
| `components/WatchNotification.tsx` | Same `hideAuthor` prop |

---

## 8. Styling Guidelines

- Use **only** tokens from `theme/index.ts` (`colors`, `fonts`, `spacing`, `typography`)
- Header uses `textAlign: 'center'` for the editorial centered layout
- Bio uses `fonts.bodyItalic` + `typography.magazineBody` — consistent with the italic pull-quote aesthetic
- Username uses `typography.magazineMeta` (uppercase, letter-spaced) — same as existing `ProfileHeader`
- Hairline divider between header and feed list — `StyleSheet.hairlineWidth` + `colors.border`
- "View on Letterboxd" link uses `colors.teal` for the interactive color
- All spacing follows the existing scale: `spacing.xs` through `spacing.xxl`
- Font sizes respect `fontMultiplier` via `getScaledTypography()` from the theme

---

## 9. Implementation Prompts (Step-by-Step)

Copy each prompt below into a new Claude conversation (or the same one) in order. Each step builds on the previous one. Wait for each step to finish before moving to the next.

---

### Step 1 — Navigation Foundation

```
Read the blueprint at docs/phase-21-external-user-profile.md (sections 1 and 5).

Then do the following:

1. In navigation/types.ts, add a new FeedStackParamList type:
   - FeedDrawer: undefined
   - ExternalProfile: { username: string }

2. Create navigation/FeedStackNavigator.tsx:
   - Use createNativeStackNavigator with FeedStackParamList.
   - First screen: FeedDrawer → renders FeedDrawerNavigator (headerShown: false).
   - Second screen: ExternalProfile → renders a placeholder <Text>TODO</Text> for now. Give it a clean header style matching our theme (PlayfairDisplay heading font, cream background).

3. In navigation/AppTabs.tsx, swap the Feed tab's component from FeedDrawerNavigator to FeedStackNavigator.

Do NOT touch any other files yet. Verify the app compiles and the Feed tab still works with the drawer.
```

---

### Step 2 — External Profile Scraping Service

```
Read the blueprint at docs/phase-21-external-user-profile.md (section 2).
Read services/feed.ts to understand the existing scraping patterns (fetchAvatarUrl, AVATAR_REGEX, etc.).

Create services/externalProfile.ts with:

1. An ExternalProfileMeta interface: { displayName: string; bio: string; websiteUrl?: string }

2. A fetchExternalProfileMeta(username: string) function that:
   - Checks an in-memory Map cache first (5-minute TTL).
   - On cache miss, fetches https://letterboxd.com/{username}/ HTML.
   - Extracts the bio from <div class="body-text -bio"> (regex). Fallback: <meta name="description" content="...">.
   - Extracts displayName from <title> tag (strip " • Letterboxd" suffix). Fallback: empty string.
   - Optionally extracts websiteUrl from the profile sidebar links.
   - Stores result in the memory cache and returns it.
   - On fetch failure, returns { displayName: '', bio: '' }.

3. A clearProfileCache() function (for pull-to-refresh).

Also in services/feed.ts, add the export keyword to fetchUserFeed (it's currently not exported).

Do NOT create any screens or UI yet.
```

---

### Step 3 — External Profile Header Component

```
Read the blueprint at docs/phase-21-external-user-profile.md (section 3, the wireframe and design decisions).
Read components/profile/ProfileHeader.tsx for reference on existing styling patterns.
Read theme/index.ts for available tokens.

Create components/profile/ExternalProfileHeader.tsx:

Props: { displayName: string; username: string; bio: string; avatarUrl?: string; websiteUrl?: string }

Layout (centered, editorial "author bio" style):
- Avatar: 72px circle, centered. Use expo-image's Image component for caching. Show initial-letter placeholder if no URL (same pattern as ProfileHeader).
- Display name: PlayfairDisplay_700Bold, magazineTitle size, centered.
- @USERNAME: magazineMeta style (uppercase, letter-spaced), centered, secondaryText color.
- Bio (if non-empty): bodyItalic font, magazineBody size, centered, foreground color, marginTop spacing.lg.
- "View on Letterboxd" link: teal color, centered, uses Linking.openURL. Small text, subtle. marginTop spacing.md.
- Bottom hairline divider: StyleSheet.hairlineWidth, colors.border, full width, marginTop spacing.xl.

Use StyleSheet.create for all styles. Follow the existing theme tokens exactly.
```

---

### Step 4 — External Profile Screen

```
Read the blueprint at docs/phase-21-external-user-profile.md (sections 2, 3, and 6).
Read screens/FeedScreen.tsx to understand how ReviewCard and WatchNotification are rendered in a FlatList.
Read screens/ProfileScreen.tsx for loading/error state patterns.

Create screens/ExternalProfileScreen.tsx:

1. Extract the username param from the route using useRoute<...>().

2. State: reviews (Review[]), meta (ExternalProfileMeta | null), isLoading, error, refreshing.

3. On mount (useEffect), fetch both in parallel:
   - fetchUserFeed(username) → set reviews
   - fetchExternalProfileMeta(username) → set meta
   - Use the avatarCache hook (useAvatarUrl) for the avatar URL.

4. Render a FlatList:
   - ListHeaderComponent: ExternalProfileHeader with the scraped meta + avatar.
   - Items: map each Review to ReviewCard (type 'review') or WatchNotification (type 'watch'), respecting the showWatchNotifications preference from DisplayPreferencesContext.
   - ListEmptyComponent: "No activity yet" text (only when not loading).
   - Pull-to-refresh: clear the profile cache, re-fetch both.

5. Loading state: Spinner centered (same as ProfileScreen).
6. Error state: ErrorBanner + "View on Letterboxd" fallback link.

Then update navigation/FeedStackNavigator.tsx to replace the placeholder with this real screen. Set the header title to the username.
```

---

### Step 5 — Wire Up Navigation from UserListPanel

```
Read components/UserListPanel.tsx. Find every place that calls Linking.openURL to open a Letterboxd profile.

Replace each one with navigation to our new ExternalProfile screen:
- Use useNavigation with the correct typed navigator (NativeStackNavigationProp<FeedStackParamList>).
- Call navigation.navigate('ExternalProfile', { username: u.username }).
- Remove the Linking import if it's no longer used anywhere in the file.

Test: tapping a username in the drawer should now push the ExternalProfileScreen instead of opening Safari.
```

---

### Step 6 — Wire Up Navigation from ReviewCard & WatchNotification

```
Read components/ReviewCard.tsx and components/WatchNotification.tsx.

For both components:

1. Add an optional prop: hideAuthor?: boolean (defaults to false).

2. Find the Pressable/TouchableOpacity that opens the author's Letterboxd profile via Linking.openURL.
   - Replace it with navigation.navigate('ExternalProfile', { username: review.username }).
   - If hideAuthor is true, hide the author name entirely (don't render it).

3. In screens/ExternalProfileScreen.tsx, pass hideAuthor={true} when rendering ReviewCard and WatchNotification so the username isn't shown redundantly on the profile page.

Test: tapping an author name in the feed should push the profile screen. On the profile screen itself, author names should be hidden.
```

---

### Step 7 — Polish & Edge Cases

```
Read docs/phase-21-external-user-profile.md (section 4 — Caching & Performance).

Final polish pass:

1. In services/externalProfile.ts, add an in-memory feed cache:
   - Map<string, { reviews: Review[]; fetchedAt: number }> with 5-minute TTL.
   - fetchUserFeed results should be cached here so back-then-forward navigation is instant.
   - Pull-to-refresh bypasses this cache.

2. Test these edge cases and make sure they work:
   - User with no bio → header shows avatar + name only, no empty space.
   - User with no reviews → "No activity yet" empty state.
   - Network failure → ErrorBanner with a "View on Letterboxd" fallback link.
   - Rapid back-and-forth navigation → cached data renders instantly.

3. Make sure the stack header back button works correctly and returns to the feed.

4. Verify display preferences (showRatings, useDropCap, showWatchNotifications, fontMultiplier) all apply correctly on the external profile screen.

Do NOT add any features beyond what the blueprint specifies.
```

---

### Step 8 — Commit

```
/commit
```
