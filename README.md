# Village du Cin&eacute;ma

**A social app for cinema lovers, built with React Native.**

Village (short for Village du Cin&eacute;ma) aggregates Letterboxd activity into an editorial-style feed. Follow your favorite film critics, save quotes from their reviews, and share beautifully typeset cards — all from your phone.

---

## Features

### Feed
- **Letterboxd RSS integration** — follow any Letterboxd user by username and see their reviews, ratings, and watch activity in a unified timeline
- **Merged social feed** — Letterboxd reviews, saved quotes, and reposts from followed Village members appear in one chronological stream
- **Drawer filter** — swipe or tap the facepile to filter the feed by specific users
- **Pull-to-refresh** with animated spinner and skeleton loading states

### Social
- **Village profiles** — create an account with avatar, display name, and bio
- **Dual follow system** — follow Letterboxd users (via RSS) and native Village members
- **User search** — find Village members by name or look up any Letterboxd username
- **Repost reviews** — share a Letterboxd review to your Village feed with one swipe
- **Linkable avatars** — tap any avatar or username in the feed to visit their profile

### Reading & Sharing
- **Immersive Review Reader** — full-screen reading experience with editorial typography
- **Long-press to clip** — press and hold a passage in any review to save it as a quote clipping
- **Quote export** — generate shareable 9:16 story cards with film metadata, styled for Instagram/social
- **Clippings scrapbook** — all saved quotes live in your profile tab

### Design
- **Editorial typography** — EB Garamond body text paired with Playfair Display headings, inspired by Cahiers du Cinema
- **Dynamic font scaling** — adjustable text size across the entire app
- **Dark mode** — full light/dark theme with system-aware switching
- **60 FPS animations** — gesture-driven tab bar hide/show, spring-based transitions, and native stack navigation via Reanimated

### Auth & Access
- **Google OAuth** — one-tap sign in with branded button and automatic avatar import
- **Email/password** — traditional auth with validation
- **Guest mode** — full browse and follow experience without creating an account, persisted to local storage
- **Profile setup flow** — guided onboarding after sign-up with avatar picker and validation

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.83 / Expo SDK 55 |
| Language | TypeScript 5.9 (strict) |
| Backend | Supabase (Auth, Database, Storage) |
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
│   ├── ExternalProfileScreen   # Letterboxd user profile with follow/bio/feed
│   ├── NativeProfileScreen     # Village member profile
│   ├── ProfileScreen           # Own profile with clippings scrapbook
│   ├── EditProfileScreen       # Avatar upload, display name, bio editing
│   ├── ProfileSetupScreen      # Post-signup onboarding flow
│   ├── SettingsScreen          # Theme, font scaling, display preferences
│   ├── WelcomeScreen           # Landing page with animated logo and filmmaker quote
│   ├── LoginScreen             # Email + Google OAuth sign in
│   └── SignupScreen            # Account creation
├── components/
│   ├── ui/                     # Primitives (Spinner, SwipeableRow, FollowButton, etc.)
│   ├── feed/                   # FeedEmptyState, RepostCard, DrawerTrigger, skeletons
│   ├── profile/                # ClippingCard, ProfileHeader, FollowingList
│   └── quote/                  # ExportCanvas (9:16 story card renderer)
├── contexts/                   # 7 providers (Auth, Theme, GuestMode, TabBar, Profile, etc.)
├── hooks/                      # 7 custom hooks (useUser, useClippings, useTypography, etc.)
├── navigation/                 # Stack, tab, and drawer navigators with type-safe params
├── services/                   # Feed fetching, avatar caching, clippings, external profiles
├── theme/                      # Design tokens, color palettes, font registry
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
git clone https://github.com/your-org/ville-du-cinema-mobile.git
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
