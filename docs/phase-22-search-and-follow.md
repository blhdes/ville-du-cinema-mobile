# Phase 22: Universal Profile Search & Supabase Follow Integration

## Overview

Expand the `ExternalProfileScreen` to allow users to search for ANY Letterboxd user, visit their profile, and Follow/Unfollow them. Follow state syncs with Supabase via the existing `followed_users` JSONB column — no schema changes required.

---

## 1. Native Search UI Integration

### Recommendation: Magnifying glass icon in the native stack header

The `ExternalProfile` screen in `FeedStackNavigator.tsx` already configures `options` per-route. We add a `headerRight` component — a small magnifying glass icon (`Ionicons` `search-outline`) that, when tapped, pushes a new `UserSearchScreen` onto the stack.

### Why a dedicated screen (not inline TextInput or bottom sheet)

- A bottom sheet would fight with the FlatList scroll on the ExternalProfile screen.
- An expanding TextInput in the native header is fragile on Android and doesn't give room for search results/autocomplete feedback.
- A lightweight full-screen search screen (think Instagram's search) is the cleanest pattern — it's just a `TextInput` auto-focused + a submit action that validates the username and pushes `ExternalProfile`.

### UI Flow

```
[ExternalProfileScreen]
   ↓ tap 🔍 (headerRight)
[UserSearchScreen]  ← new screen, auto-focused TextInput
   ↓ user types "davidlynch" → taps GO / keyboard submit
   ↓ validates username exists (reuse fetchDisplayName from services/feed.ts)
   ↓ on success: navigation.replace('ExternalProfile', { username: 'davidlynch' })
   ↓ on failure: inline error "User not found"
```

### Also accessible from the Feed screen

The `FeedDrawer` header could get the same 🔍 icon, so search is reachable from the main feed — not just from an existing profile.

### Screen Design: `UserSearchScreen`

- Dark background matching `colors.background`
- Centered `TextInput` with bottom border (same style as `UserListPanel` input)
- `autoFocus={true}`, `autoCapitalize="none"`, `autoCorrect={false}`
- Submit button styled as teal `GO` text (reuses `magazineMeta` typography)
- Inline error text in `colors.red` below the input
- Spinner replaces `GO` text while validating

### Files to modify

| File | Action |
|------|--------|
| `navigation/types.ts` | Add `UserSearch` to `FeedStackParamList` and `ProfileStackParamList` |
| `navigation/FeedStackNavigator.tsx` | Register `UserSearchScreen` route + add `headerRight` search icon on `ExternalProfile` |
| `navigation/ProfileStackNavigator.tsx` | Same `headerRight` icon + route registration |
| `screens/UserSearchScreen.tsx` | **New file** — minimal search screen with validation |

---

## 2. Follow/Unfollow Button on External Profile

### UI Design

An editorial-style button placed inside `ExternalProfileHeader.tsx`, directly below the metadata row (location/website/twitter). Two visual states:

| State | Appearance |
|-------|-----------|
| **Not following** | Outlined border (`colors.teal`), teal text: `FOLLOW` (uppercase, `magazineMeta` style, `letterSpacing: 1.5`) |
| **Following** | Solid `colors.teal` background, white text: `FOLLOWING` |

Tapping `FOLLOWING` immediately switches to `FOLLOW` (optimistic). No confirmation dialog — matching the lightweight editorial feel of the app. Haptic feedback on both actions (`Haptics.impactAsync`).

### State Management — "Am I following this user?"

The `ExternalProfileScreen` already has access to `useUserLists()` via the global `UserListsProvider` context. On mount, it derives the follow state:

```typescript
const { usernames, addUser, removeUser } = useUserLists()
const isFollowing = usernames.includes(username)
```

This is a **derived value** — no new state needed. The `UserListsProvider` is the single source of truth, and it's already globally available.

### Mutation — Optimistic Updates

The existing `addUser` and `removeUser` in `UserListsProvider.tsx` already implement optimistic updates with Supabase rollback. The Follow button simply calls them:

```
Follow tap   → addUser(username)
               ├── Optimistic: insert into followed_users array (instant UI update)
               ├── Background: Supabase upsert { followed_users: [...existing, newUser] }
               └── Background: refreshAvatarUrls([username]) — avatar scraped + cached

Unfollow tap → removeUser(username)
               ├── Optimistic: filter from followed_users array (instant UI update)
               └── Background: Supabase update { followed_users: filtered }
```

**No new Supabase table or column needed** — the existing `followed_users` JSONB array on `user_data` handles everything.

### New props on `ExternalProfileHeader`

```typescript
// Added to existing props interface
isFollowing: boolean
onFollowToggle: () => void
```

### Files to modify

| File | Action |
|------|--------|
| `components/profile/ExternalProfileHeader.tsx` | Add `isFollowing` + `onFollowToggle` props, render Follow/Following button below metadata |
| `screens/ExternalProfileScreen.tsx` | Import `useUserLists`, derive `isFollowing`, wire toggle handler into header |

---

## 3. On-Demand Fetching & Cache Transition

### The Problem

When you search for `davidlynch`, that user isn't in your `followed_users` list, so their data doesn't exist in the 5-minute feed cache or the avatar cache. Everything must be fetched on the fly.

### Current behavior already handles this

`ExternalProfileScreen` calls `fetchUserFeed(username)` and `fetchExternalProfileMeta(username)` regardless of whether the user is followed. Both services have their own 5-minute in-memory caches. Visiting a searched user's profile works identically to visiting a followed user's profile — the data pipeline is the same.

### The Transition: Unfollowed → Followed

When the user taps `FOLLOW` on a previously unfollowed profile, here's the exact sequence:

```
1. Button press
   │
2. addUser(username) called (UserListsProvider)
   │
   ├── Optimistic: username added to `users` state
   │   └── All context consumers re-render (including FeedScreen)
   │
   ├── Background: fetchDisplayName(username)
   │   └── Already cached from ExternalProfileScreen load — instant
   │
   ├── Background: refreshAvatarUrls([username])
   │   └── Scrapes profile HTML → writes to avatarCache (AsyncStorage + memory)
   │   └── Already cached from ExternalProfileScreen load — instant
   │
   └── Background: Supabase upsert { followed_users: [...existing, newUser] }
   │
3. FeedScreen effect (triggered by context change)
   │
   ├── useUserLists().usernames now includes the new username
   │   └── FeedScreen's useEffect depends on usernames — re-triggers fetchFeed()
   │
   ├── fetchFeed([...oldUsernames, newUsername])
   │   └── fetchUserFeed(newUsername) → CACHE HIT (populated during profile visit)
   │   └── No network request needed — the data is already warm
   │
   └── Feed re-renders with the new user's reviews merged in, sorted by date
       └── No hard reload, no flicker — seamless integration
```

### Key Insight

Because `ExternalProfileScreen` already called `fetchUserFeed` and `fetchAvatarUrl` when the profile was viewed, by the time the user taps Follow, both the feed cache and avatar cache are warm. The FeedScreen picks up the new username from context, calls `fetchFeed`, and gets a cache hit. **No hard reload needed.**

### Edge Case: Follow without visiting profile (e.g., from UserListPanel)

This already works today. `addUser` calls `fetchDisplayName` (validates + caches) and `refreshAvatarUrls` (scrapes + caches). When FeedScreen re-renders, `fetchUserFeed` does a fresh network fetch for the new user since there's no cache entry — but that's expected and fast.

### No changes needed to the caching layer

The existing architecture naturally handles this transition. No modifications to:

- `services/feed.ts`
- `services/avatarCache.ts`
- `services/externalProfile.ts`

---

## 4. Complete File Change Checklist

### Modified files

| File | Action |
|------|--------|
| `navigation/types.ts` | Add `UserSearch` route to both stack param lists |
| `navigation/FeedStackNavigator.tsx` | Register `UserSearchScreen` + add `headerRight` 🔍 icon |
| `navigation/ProfileStackNavigator.tsx` | Same: register route + header icon |
| `screens/ExternalProfileScreen.tsx` | Wire `useUserLists()` → pass `isFollowing` + toggle to header |
| `components/profile/ExternalProfileHeader.tsx` | Add Follow/Following button + new props |

### New files

| File | Purpose |
|------|---------|
| `screens/UserSearchScreen.tsx` | Full-screen search with TextInput, validation, and navigation |

### Unchanged files (no modifications needed)

| File | Why |
|------|-----|
| `services/feed.ts` | Caching already works for arbitrary usernames |
| `services/avatarCache.ts` | Already handles on-demand writes |
| `services/externalProfile.ts` | Already fetches any username |
| `contexts/UserListsProvider.tsx` | `addUser`/`removeUser` already do optimistic updates + Supabase sync |
| `types/database.ts` | No schema changes — `followed_users` JSONB handles it |
| `lib/supabase/client.ts` | No client changes needed |

---

## 5. Open Design Decisions

1. **Search icon placement** — Should the 🔍 also appear on the main Feed screen header, or only on `ExternalProfile`?
2. **Unfollow confirmation** — One-tap unfollow (instant, editorial feel) or a brief confirmation ("Remove from feed?")?
3. **Search validation UX** — Spinner inside the GO button vs. a full-screen loading indicator while validating the username?
