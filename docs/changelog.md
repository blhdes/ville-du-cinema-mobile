# Changelog — feature/tos-compliant-rebuild

Track record of all changes across phases on this branch.

---

## Phase 0 — ToS Compliance Cleanup

**Commit:** `2a125de` — refactor: remove all HTML scraping and stale docs

### Removed
- `services/externalProfile.ts` (317 lines) — HTML scraping for bios, locations, websites, twitter handles, favorite films, display names from `<title>` tag
- `services/avatarCache.ts` (91 lines) — scraped avatar persistence layer (AsyncStorage + in-memory cache with listener pattern)
- Avatar scraping from `services/feed.ts` — removed AVATAR_REGEX, extractAvatarUrl, fetchAvatarUrl, refreshAvatarUrls, avatar-fetching map
- `components/ReviewCard.tsx` — removed `useAvatarUrl` hook, removed avatar `<Image>` from meta row
- `screens/FeedScreen.tsx` — removed `hydrateAvatarCache`, `refreshAvatarUrls` imports and `cacheReady` state gate
- `screens/ExternalProfileScreen.tsx` — removed all scraping calls, simplified to RSS-only. Display name sourced from `reviews[0]?.creator || username`
- `components/profile/ExternalProfileHeader.tsx` — rewritten: stripped all scraped props (bio, location, website, twitter, favorites, avatar). Now: initials avatar, display name + LetterboxdDots, @username, "View full profile on Letterboxd" link, follow button
- `components/feed/DrawerTrigger.tsx` — rewritten: facepile now uses `villageUsers` (native users with `avatar_url`), minimum 2 profiles to display, falls back to `people-outline` icon
- Stale docs from `/docs` (kept only `letterboxd-compliance-audit.md`)

### Why
Letterboxd ToS clause 6.11 prohibits automated access to their HTML pages. RSS consumption is explicitly sanctioned. This phase removed all scraping code to make the app fully compliant.

---

## Phase 0.5 — Profile Metadata Fields

**Commit:** `19b9520` — feat: profile metadata fields (location, website, X, Letterboxd)

### Added
- `supabase/migrations/20260323_add_profile_metadata_fields.sql` — 5 new nullable columns on `user_data`: `location`, `website_url`, `website_label`, `twitter_handle`, `letterboxd_username`
- `docs/profile-metadata-fields.md` — implementation spec

### Modified
- `types/database.ts` — added 5 fields to `UserData.Row/Insert/Update`, `UserProfile`, `VillagePublicProfile`, `PublicProfile`
- `hooks/useProfile.ts` — expanded `updateProfile` signature, updated `DEFAULT_PROFILE` with new null fields
- `screens/EditProfileScreen.tsx` — 5 new `useState` entries, 5 new `TextInput` fields (Location, Website URL + label, X/Twitter, Letterboxd), cleanup logic on save (strip `@`, trailing `/`)
- `components/profile/ProfileHeader.tsx` — added metadata row with Ionicons for location, globe for website (opens WebBrowser), unicode glyph for X (opens Linking), LetterboxdDots for Letterboxd link. Props accept `UserProfile | VillagePublicProfile`
- `screens/NativeProfileScreen.tsx` — updated `.select()` to include the 5 new columns

### Why
Replaced scraped external profile metadata with user-entered data stored in Supabase. Fully compliant — no Letterboxd data fetched, all user-owned.

---

## Phase 1 — TMDB Foundation + Film Card

**Commit:** `3cbd6e6` — feat: TMDB integration and Film Card screen (Phase 1)

### Added
- `types/tmdb.ts` — TMDB response types: `TmdbMovieDetail`, `TmdbSearchResult`, `TmdbPaginatedResponse`, `TmdbCreditPerson`, `TmdbVideo`, `TmdbGenre`
- `services/tmdb.ts` — TMDB API client with in-memory caching (10-min TTL). Exports: `posterUrl`, `backdropUrl`, `getMovieDetail` (uses `append_to_response=credits,videos`), `searchMovies`, `getTrending`, `findMovieByTitle`, `clearTmdbCache`
- `screens/FilmCardScreen.tsx` — Film hub screen: backdrop image + gradient overlay, poster + title/year/runtime/score, director credit, genre chips, expandable synopsis, top-8 cast grid (2 columns), trailer deep link, "View on Letterboxd" link. Deferred load via `InteractionManager.runAfterInteractions()`, pull-to-refresh, loading/error states
- `.env` — added `EXPO_PUBLIC_TMDB_API_KEY` (gitignored)

### Modified
- `navigation/types.ts` — added `FilmCardParams` and `FilmCard` route to `FeedStackParamList` and `ProfileStackParamList`
- `navigation/FeedStackNavigator.tsx` — registered `FilmCardScreen`
- `navigation/ProfileStackNavigator.tsx` — registered `FilmCardScreen`
- `components/ReviewCard.tsx` — movie title tap now calls `findMovieByTitle()` and navigates to `FilmCard`; fallback searches Letterboxd if no TMDB match

### Why
TMDB is the free movie metadata backbone. Film Cards are the atomic unit of Village — every piece of content orbits a specific movie. This phase establishes the foundation before social features (Takes, Likes, etc.) are layered on top.

---

## Phase 2 — Takes (Village-native posts)

**Commits:** (uncommitted — working tree)

### Added
- `supabase/migrations/20260325_create_takes_table.sql` — `takes` table with columns: `id`, `user_id`, `tmdb_id`, `movie_title`, `poster_path`, `content` (280 char limit), `created_at`. RLS: public read, author insert/delete. Indexed by `(user_id, created_at desc)` and `(tmdb_id, created_at desc)`
- `services/takes.ts` — CRUD service: `createTake`, `getUserTakes`, `getFilmTakes`, `getVillageTakes`, `deleteTake`. Follows `services/clippings.ts` pattern
- `hooks/useTakes.ts` — React hook following `useClippings` pattern: fetch user takes, optimistic delete, refetch
- `components/TakeCard.tsx` — Card component mirroring ReviewCard layout: film title header (tappable → Film Card), avatar + author name + date meta row (tappable → NativeProfile), plain text body (280 chars), hairline divider. SwipeableRow for delete. Props: `author`, `hideAuthor`, `onDeleted`, `readOnly`
- `screens/CreateTakeScreen.tsx` — Modal screen: TMDB film search (debounced) → 280-char text input with character counter. Cancel/Post header buttons. Pre-fills film when navigated from Film Card. Haptic feedback on post success/error

### Modified
- `types/database.ts` — added `Take` interface, `takes` table to `Database` schema, `TakeFeedItem` to Super-Feed types, updated `FeedItem` discriminated union to include `'take'` kind
- `navigation/types.ts` — added `CreateTakeParams` and `CreateTake` route to both `FeedStackParamList` and `ProfileStackParamList`
- `navigation/FeedStackNavigator.tsx` — registered `CreateTakeScreen` as modal
- `navigation/ProfileStackNavigator.tsx` — registered `CreateTakeScreen` as modal
- `screens/FilmCardScreen.tsx` — added "Write a Take" action button, added Takes section showing all takes about the film (fetched via `getFilmTakes`), loads takes in parallel with movie detail via `Promise.allSettled`
- `screens/FeedScreen.tsx` — fetches village takes via `getVillageTakes` alongside village clippings, merges `TakeFeedItem` into Super-Feed chronological sort, renders `TakeCard` in `renderItem`, handles `'take'` in `keyExtractor` and watch-notification filter
- `screens/ProfileScreen.tsx` — added Takes section with "+" button (navigates to CreateTake) above Clippings, fetches own takes via `getUserTakes` in parallel with clippings, swipe-to-delete own takes
- `screens/NativeProfileScreen.tsx` — added Takes section (read-only, `hideAuthor`) on other Village users' profiles, fetches takes via `getUserTakes` in parallel with clippings, updated meta count to show "X takes · Y clippings"

### Design decisions
- **Denormalized `movie_title` + `poster_path`** in the takes table — avoids a TMDB fetch for every card render in feeds and profiles
- **Takes are immutable** — no UPDATE RLS policy. Delete and repost if you want to change it
- **TakeCard mirrors ReviewCard** — same visual hierarchy (film title → author meta → body → divider) so Takes feel like a native sibling of RSS reviews in the feed, but lighter and text-only
- **`hideAuthor` prop** — used on profile screens where the author is already clear from context (same pattern as ReviewCard's `hideAuthor`)
- **Super-Feed integration** — Takes merge chronologically with reviews, clippings, and reposts via the existing `FeedItem` discriminated union + `sortKey` pattern

### Migration to run
```sql
-- Paste contents of supabase/migrations/20260325_create_takes_table.sql in Supabase SQL Editor
```

---

## Phase 3 — Likes & Comments

**Commits:** (uncommitted — working tree)

### Added
- `supabase/migrations/20260326_create_likes_comments_tables.sql` — `take_likes` table (composite PK `user_id + take_id`, indexed by `take_id`) + `take_comments` table (`id`, `user_id`, `take_id`, `content` 280 chars, `created_at`, indexed by `(take_id, created_at asc)`). Both with RLS: `TO authenticated` — public read, author insert/delete
- `services/likes.ts` — `toggleLike` (check-then-insert/delete), `getLikeStatus` (single take), `getBatchLikeStatus` (feed-level, two queries + client-side grouping)
- `services/comments.ts` — `getComments` (oldest-first for chat order), `createComment`, `deleteComment`, `getBatchCommentCounts` (feed-level)
- `hooks/useLike.ts` — optimistic toggle with haptic feedback, dual-source (accepts pre-resolved batch data or self-fetches), rollback on failure
- `hooks/useComments.ts` — fetches comments + batch-resolves author info from `user_data`, optimistic add (with temporary ID replaced on server response) + optimistic delete
- `screens/TakeDetailScreen.tsx` — full Take view with: film title + author row + body + like button (larger), flat comment thread (FlatList), swipe-to-delete own comments (SwipeableRow), sticky bottom input bar with 280-char limit + character counter + send button. Fetches Take by ID via `getTakeById`

### Modified
- `types/database.ts` — added `TakeLike`, `TakeComment`, `TakeCommentWithAuthor` interfaces + `take_likes` and `take_comments` table definitions in `Database` schema
- `services/takes.ts` — added `getTakeById(takeId)` for the detail screen
- `navigation/types.ts` — added `TakeDetailParams` (takeId + optional author) and `TakeDetail` route to both `FeedStackParamList` and `ProfileStackParamList`
- `navigation/FeedStackNavigator.tsx` — registered `TakeDetailScreen`
- `navigation/ProfileStackNavigator.tsx` — registered `TakeDetailScreen`
- `components/TakeCard.tsx` — added interaction bar below body text (heart icon with count + comment icon with count), entire card taps to TakeDetail, new props: `initialLiked`, `initialLikeCount`, `commentCount` for batch pre-fetch in feeds. Uses `useLike` hook internally (self-sufficient when no batch data provided)
- `screens/FeedScreen.tsx` — batch-fetches `getBatchLikeStatus` + `getBatchCommentCounts` when `villageTakes` change, passes pre-resolved data to TakeCard props

### Design decisions
- **Optimistic updates everywhere** — likes toggle instantly (flip icon + adjust count), comments appear immediately (replaced with real ID on server response). Rollback on failure with `console.error`
- **Batch pre-fetch in feed** — avoids N+1 queries by running two queries per batch (user's likes + all likes for counting). TakeCard on FilmCardScreen/ProfileScreen self-fetches instead (acceptable for 5-10 cards)
- **Client-side like counting** — Supabase JS client lacks native GROUP BY. Fetches all `take_id` rows and counts in JS. Clean RPC upgrade path if needed at scale
- **Flat comment threads** — no nesting, no reply-to. Keeps UI simple and matches the 280-char short-form philosophy
- **TakeDetailScreen fetches Take by ID** — only `takeId` + optional `author` in route params (lightweight, serializable). Avoids passing the full Take object through navigation which would break on deep links
- **Comments ordered oldest-first** — chat-thread convention (newest at bottom, near the input)

### Migrations to run
```sql
-- Paste contents of supabase/migrations/20260326_create_likes_comments_tables.sql in Supabase SQL Editor
```

---

## Phase 4 — Discovery Tab

**Commits:** (uncommitted — working tree)

### Added
- `services/takes.ts` — `getNetworkFilms(userIds, limit?)`: queries recent takes from followed Village users, groups by `tmdb_id` client-side, returns top N films sorted by take count. Exports `NetworkFilm` interface
- `components/discover/TrendingPosterCard.tsx` — small poster card (120×180) for horizontal carousel: poster image, title, year. Taps → FilmCard. Memo-wrapped
- `components/discover/NetworkFilmRow.tsx` — row component: mini poster thumbnail (44×66) + film title + take count label. Taps → FilmCard. Memo-wrapped
- `screens/DiscoverScreen.tsx` — Discovery hub screen: search bar with debounced TMDB search (350ms), "Trending This Week" horizontal poster carousel via `getTrending`, "In Your Network" section via `getNetworkFilms`, "Find people to follow" link → UserSearch. Deferred load via `InteractionManager.runAfterInteractions()`, pull-to-refresh with `clearTmdbCache()`
- `navigation/DiscoverStackNavigator.tsx` — native-stack navigator mirroring Feed/Profile pattern: registers DiscoverMain, ExternalProfile, NativeProfile, UserSearch, ReviewReader, QuotePreview, FilmCard, CreateTake, TakeDetail

### Modified
- `navigation/types.ts` — added `DiscoverStackParamList` (DiscoverMain + all shared routes), added `Discover` to `AppTabsParamList`
- `navigation/AppTabs.tsx` — added `Discover` tab between Feed and Profile: compass-outline icon with bounce animation (`scales.Discover`, `DiscoverIcon`, `onDiscoverPress`), imported `DiscoverStackNavigator`

### Design decisions
- **Compass icon** — `compass-outline` from Ionicons. Distinct from Feed (custom icon) and Profile (avatar/person), conveys exploration
- **Tab order: Feed | Discover | Profile | Settings** — Discover sits next to Feed (content consumption flow), Profile and Settings remain on the right (personal/config)
- **Client-side film grouping** — `getNetworkFilms` fetches up to 200 recent takes and groups by `tmdb_id` in JS. Avoids a Supabase RPC for now; clean upgrade path if the query gets heavy
- **Search is inline** — no separate SearchScreen. The search bar at the top of Discover replaces the browse content with TMDB search results. Clearing the query restores the browse view
- **Deferred load** — `InteractionManager.runAfterInteractions()` ensures the tab transition animation completes before data fetching starts

---

## Upcoming Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 5 | Watchlist & Favorite Films | Planned |
| 6 | Film-Anchored Clippings | Planned |

See `docs/village-social-layer.md` for the full vision and roadmap.

---

## TL;DR — Plain English Summary

A phase-by-phase recap for anyone who doesn't want to read the technical details.

---

**Phase 0 — Cleaning the house**

The original app was spying on Letterboxd's website — quietly scraping profile pages to grab user photos, bios, locations, and social links. Letterboxd's terms of service explicitly prohibit this. So Phase 0 was a cleanup: all that scraping code was deleted. The app now only uses Letterboxd's RSS feed, which they explicitly allow.

**Phase 0.5 — Rebuilding what was lost**

Because we deleted the scraped profile data, user profiles were now bare. This phase rebuilt it the right way: instead of secretly grabbing info from Letterboxd, the app now asks *you* to fill in your own location, website, X/Twitter, and Letterboxd username. That data is stored in Village's own database, so it belongs to the app and the user — not stolen from elsewhere.

**Phase 1 — A free movie database as the backbone**

Instead of depending on Letterboxd for movie info, we plugged into **TMDB** (The Movie Database) — a free, open API that any developer can use. Now when you tap on a film, the app fetches the poster, cast, director, trailer, synopsis, and rating directly from TMDB. This creates a "Film Card" — a rich movie page that lives inside Village itself. Everything else (takes, likes, comments) gets built on top of these film cards.

**Phase 2 — Takes (Village's own posts)**

This is where Village stops being a companion app and starts becoming a social network. A "Take" is a short post (up to 280 characters) tied to a specific film. You write one, it shows up in your followers' feeds. Think of it like a tweet, but every tweet is about a movie. Each Take shows the film title at the top, your avatar, and your text — no clutter. You can write a Take from a film's page, or from your profile.

**Phase 3 — Likes & Comments**

Takes can now be liked (a heart button) and replied to (a flat comment thread below the post). Likes and comments update instantly on screen without waiting for the server — if something goes wrong, it quietly rolls back. Comment threads are kept simple and flat: no nesting, no quote-replies, just a conversation under the Take.

**Phase 4 — Discovery Tab**

A new tab (the compass icon) that helps you find films and people. At the top, a search bar lets you look up any movie from TMDB. Below that, a carousel of films trending globally this week. And if you already follow people on Village, there's a "In Your Network" section showing which films those people have been posting about — so you can discover films through the people you trust, not an algorithm.

---

The through-line: **Village started as a Letterboxd companion. It's being rebuilt as a standalone social cinema layer — your own network, your own posts, centered on films.**
