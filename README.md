# Village du Cinema

**A social app for cinema lovers, built with React Native.**

Village is a social cinema layer where film lovers build their own voice, share thoughts about movies, and connect with others who care about film as culture. It aggregates Letterboxd criticism through sanctioned RSS feeds, and extends it with a native social layer powered by TMDB and Supabase.

---

## Features

### Feed
- **Merged social feed** — Letterboxd reviews, Takes (short posts), Clippings (saved quotes), and Reposts from followed members in one chronological stream
- **Letterboxd RSS integration** — follow any Letterboxd user by username
- **Drawer filter** — swipe or tap to filter the feed by specific users
- **Pull-to-refresh** with skeleton loading states

### Film Cards (TMDB)
- **Rich film detail pages** — poster (expandable), backdrop, genres, synopsis, cast, trailer
- **Tappable credits** — tap title, director, or cast names to search in in-app browser
- **External links** — IMDb and Letterboxd badge links inline with genres
- **Village Reactions** — Takes and Clippings about a film, merged chronologically (3 default, show more up to 15)
- **Watchlist** — "Want to watch" / "Seen it" with optimistic toggle
- **Write a Take** — compose button in the nav header

### Social
- **Takes** — short-form posts (280 chars) anchored to a TMDB film, with likes and comments
- **Village profiles** — avatar, display name, bio, location, website, X, Letterboxd link
- **Dual follow system** — follow Letterboxd users (RSS) and native Village members
- **User search** — find Village members or look up any Letterboxd username
- **Repost reviews** — share a Letterboxd review to your Village feed with one swipe
- **Favorite Films** — pin up to 4 films on your profile (poster grid, TMDB-powered)
- **Saved Films** — personal watchlist with "want" / "seen" filters

### Discovery
- **Trending This Week** — horizontal poster carousel from TMDB
- **In Your Network** — films your followed users are talking about
- **Film search** — search TMDB with poster thumbnails in results

### Reading & Sharing
- **Immersive Review Reader** — full-screen editorial reading experience
- **Long-press to clip** — save a passage from any review as a quote clipping
- **Quote export** — generate shareable 9:16 story cards with film metadata
- **Clippings scrapbook** — all saved quotes live in your profile tab

### Design
- **Editorial typography** — EB Garamond body text paired with Playfair Display headings
- **Dynamic font scaling** — adjustable text size across the entire app (unified scaling via `useTypography`)
- **Dark mode** — full light/dark theme with system-aware switching
- **Skeleton loading** — layout-accurate pulsing skeletons for profiles and film cards
- **60 FPS animations** — gesture-driven tab bar hide/show, spring-based transitions

### Auth & Access
- **Google OAuth** — one-tap sign in with branded button
- **Email/password** — traditional auth with validation
- **Guest mode** — full browse and follow experience without an account
- **Profile setup flow** — guided onboarding after sign-up

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.83 / Expo SDK 55 |
| Language | TypeScript 5.9 (strict) |
| Backend | Supabase (Auth, Database, Storage) |
| Movie data | TMDB API |
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
├── screens/                    # 19 screens
│   ├── FeedScreen              # Main timeline with scroll-driven header/tab bar
│   ├── DiscoverScreen          # Trending, network films, TMDB search
│   ├── FilmCardScreen          # TMDB film detail with takes, clippings, watchlist
│   ├── CreateTakeScreen        # Compose a Take anchored to a film
│   ├── TakeDetailScreen        # Take thread with comments
│   ├── ReviewReaderScreen      # Immersive full-screen review reading
│   ├── QuotePreviewScreen      # Quote export with shareable card generation
│   ├── UserSearchScreen        # Dual search: Village members + Letterboxd users
│   ├── ExternalProfileScreen   # Letterboxd user profile via RSS
│   ├── NativeProfileScreen     # Village member public profile
│   ├── ProfileScreen           # Own profile with clippings, takes, compose FAB
│   ├── EditProfileScreen       # Avatar, display name, bio, location, website, socials
│   ├── SavedFilmsScreen        # Personal watchlist (want/seen)
│   ├── FavoriteFilmPickerScreen# Search and pin top-4 favorite films
│   ├── SettingsScreen          # Theme, font scaling, display preferences
│   ├── ProfileSetupScreen      # Post-signup onboarding
│   ├── WelcomeScreen           # Landing page
│   ├── LoginScreen             # Email + Google OAuth
│   └── SignupScreen            # Account creation
├── components/
│   ├── ui/                     # Primitives (Spinner, SwipeableRow, ExpandableAvatar, ImdbBadge, etc.)
│   ├── feed/                   # RepostCard, DrawerTrigger, skeletons
│   ├── film/                   # FilmCardSkeleton
│   ├── discover/               # TrendingPosterCard, NetworkFilmRow
│   ├── profile/                # ClippingCard, ProfileHeader, FavoriteFilmsGrid, FollowingList
│   └── quote/                  # ExportCanvas (9:16 story card renderer)
├── contexts/                   # 7 providers (Auth, Theme, GuestMode, TabBar, Profile, etc.)
├── hooks/                      # 13 custom hooks (useTypography, useTabBarInset, useLike, etc.)
├── navigation/                 # Stack, tab, and drawer navigators with type-safe params
├── services/                   # Feed (RSS), TMDB, Takes, Likes, Comments, Clippings, SavedFilms
├── supabase/migrations/        # SQL migration files
├── theme/                      # Design tokens, color palettes, font registry
├── docs/                       # Changelog, compliance audit, planning docs
└── types/                      # Shared TypeScript definitions (database, TMDB)
```

---

## Compliance

Village respects Letterboxd's Terms of Service:
- **RSS feeds** (`letterboxd.com/{user}/rss/`) — explicitly sanctioned
- **No HTML scraping** — all profile data is user-entered or sourced from TMDB
- **Deep links** — "View on Letterboxd" for anything Village can't show natively

See `docs/letterboxd-compliance-audit.md` for the full audit.

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
EXPO_PUBLIC_TMDB_API_KEY=your-tmdb-api-key
```

> Without these, the app runs in **guest mode** — no backend required to explore the UI.

```bash
npx expo prebuild --clean
npm run ios
```

---

## License

Private — not open source.
