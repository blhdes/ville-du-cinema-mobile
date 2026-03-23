# Village du Cinéma

**A social app for cinema lovers, built with React Native.**

Village is a social cinema layer — a place where film lovers build their own voice, share thoughts about movies, and connect with others who care about film as culture. It aggregates Letterboxd criticism through sanctioned RSS feeds, and extends it with a native social layer powered by TMDB and Supabase.

---

## Branch: `feature/tos-compliant-rebuild`

This branch represents a full rethinking of Village's identity, prompted by a Letterboxd Terms of Service audit (see `docs/letterboxd-compliance-audit.md`).

### What changed

**Removed — HTML scraping (ToS violation)**
All data previously extracted from Letterboxd HTML pages has been removed:
- `services/externalProfile.ts` — bio, location, favorite films, display name from `<title>`
- `services/avatarCache.ts` — scraped avatar persistence layer
- Avatar scraping from `services/feed.ts` and all call sites
- Letterboxd user avatars now fall back to initials placeholders throughout

**What remains compliant**
- RSS feeds (`letterboxd.com/{user}/rss/`) — explicitly sanctioned by Letterboxd
- Display names via `dc:creator` field in RSS items
- "View on Letterboxd" deep links for anything Village can't show natively

**Added — Profile metadata fields**
Village users can now add to their own profiles (user-entered, never scraped):
- Location, Website, X / Twitter, Letterboxd username
- Displayed on `ProfileScreen` and `NativeProfileScreen` with tappable links
- Configurable via `EditProfileScreen`
- Supabase migration: `supabase/migrations/20260323_add_profile_metadata_fields.sql`

### Direction

Village is no longer a Letterboxd companion. It's building its own identity:

- **RSS stays** — Letterboxd reviews are the editorial backbone and remain 100% legal
- **TMDB becomes the movie data layer** — posters, cast, trailers, recommendations, trending
- **Village profiles become native** — users build their own identity here, not a mirror of Letterboxd
- **A social layer is being built** — Takes (short posts about films), Likes, Comments, Watchlist, Favorite Films, Discovery

See `docs/village-social-layer.md` for the full roadmap.

---

## Features

### Feed
- **Letterboxd RSS integration** — follow any Letterboxd user by username and see their reviews, ratings, and watch activity in a unified timeline
- **Merged social feed** — Letterboxd reviews, saved quotes, and reposts from followed Village members appear in one chronological stream
- **Drawer filter** — swipe or tap to filter the feed by specific users
- **Pull-to-refresh** with animated spinner and skeleton loading states

### Social
- **Village profiles** — create an account with avatar, display name, bio, location, website, X, and Letterboxd link
- **Dual follow system** — follow Letterboxd users (via RSS) and native Village members
- **User search** — find Village members by name or look up any Letterboxd username
- **Repost reviews** — share a Letterboxd review to your Village feed with one swipe
- **External profiles** — tap any Letterboxd username to see their RSS feed and a link to their full Letterboxd profile

### Reading & Sharing
- **Immersive Review Reader** — full-screen reading experience with editorial typography
- **Long-press to clip** — press and hold a passage in any review to save it as a quote clipping
- **Quote export** — generate shareable 9:16 story cards with film metadata, styled for Instagram/social
- **Clippings scrapbook** — all saved quotes live in your profile tab

### Design
- **Editorial typography** — EB Garamond body text paired with Playfair Display headings, inspired by Cahiers du Cinéma
- **Dynamic font scaling** — adjustable text size across the entire app
- **Dark mode** — full light/dark theme with system-aware switching
- **60 FPS animations** — gesture-driven tab bar hide/show, spring-based transitions, and native stack navigation via Reanimated

### Auth & Access
- **Google OAuth** — one-tap sign in with branded button and automatic avatar import
- **Email/password** — traditional auth with validation
- **Guest mode** — full browse and follow experience without creating an account, persisted to local storage
- **Profile setup flow** — guided onboarding after sign-up with avatar picker and validation

---

## Roadmap (in `docs/`)

| Doc | Description |
|---|---|
| `letterboxd-compliance-audit.md` | Full ToS audit — what's legal, what was removed, and why |
| `village-social-layer.md` | Vision for Takes, Film Cards (TMDB), Likes, Comments, Discovery tab |
| `profile-metadata-fields.md` | Implementation spec for user-entered profile metadata (✅ done) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.83 / Expo SDK 55 |
| Language | TypeScript 5.9 (strict) |
| Backend | Supabase (Auth, Database, Storage) |
| Movie data | TMDB API (planned) |
| Navigation | React Navigation 7 (native-stack, bottom-tabs, drawer) |
| Animations | React Native Reanimated 4 |
| Gestures | React Native Gesture Handler |
| Fonts | Expo Google Fonts (EB Garamond, Playfair Display) |
| State | React Context + custom hooks |
| Image loading | expo-image with memory-disk caching |

---

## Project Structure

```
village/
├── screens/                    # 13 screens
│   ├── FeedScreen              # Main timeline with scroll-driven header/tab bar
│   ├── ReviewReaderScreen      # Immersive full-screen review reading
│   ├── QuotePreviewScreen      # Quote export with shareable card generation
│   ├── UserSearchScreen        # Dual search: Village members + Letterboxd users
│   ├── ExternalProfileScreen   # Letterboxd user profile via RSS + deep link
│   ├── NativeProfileScreen     # Village member public profile
│   ├── ProfileScreen           # Own profile with clippings scrapbook
│   ├── EditProfileScreen       # Avatar, display name, bio, location, website, socials
│   ├── ProfileSetupScreen      # Post-signup onboarding flow
│   ├── SettingsScreen          # Theme, font scaling, display preferences
│   ├── WelcomeScreen           # Landing page with animated logo and filmmaker quote
│   ├── LoginScreen             # Email + Google OAuth sign in
│   └── SignupScreen            # Account creation
├── components/
│   ├── ui/                     # Primitives (Spinner, SwipeableRow, FollowButton, etc.)
│   ├── feed/                   # FeedEmptyState, RepostCard, DrawerTrigger, skeletons
│   ├── profile/                # ClippingCard, ProfileHeader, ExternalProfileHeader, FollowingList
│   └── quote/                  # ExportCanvas (9:16 story card renderer)
├── contexts/                   # 7 providers (Auth, Theme, GuestMode, TabBar, Profile, etc.)
├── hooks/                      # 7 custom hooks (useUser, useClippings, useTypography, etc.)
├── navigation/                 # Stack, tab, and drawer navigators with type-safe params
├── services/                   # Feed fetching (RSS), clippings, TMDB (planned)
├── supabase/migrations/        # SQL migration files
├── theme/                      # Design tokens, color palettes, font registry
├── docs/                       # Planning docs and audit trail
└── types/                      # Shared TypeScript definitions
```

---

## Setup

### Prerequisites

- Node.js 18+
- Xcode 16+ (iOS)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Install and run

```bash
git clone https://github.com/blhdes/ville-du-cinema-mobile.git
cd ville-du-cinema-mobile
npm install
```

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> Without these, the app runs in **guest mode** — no backend required to explore the UI.

```bash
npx expo prebuild --clean
npm run ios
```

---

## License

Private — not open source.
