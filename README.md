# Ville du Cinéma — Mobile

**A cinephile social platform built for the art of cinema.**

<!-- HERO_BANNER: Replace with app screenshot or promotional banner -->
<!-- e.g., ![Ville du Cinéma](./docs/hero-banner.png) -->

---

## Key Features

- **Fluid 60 FPS UX** — gesture-driven navigation with `react-native-reanimated` and native screen transitions, zero dropped frames
- **Reanimated Skeleton Loaders** — seamless splash-to-skeleton handoff eliminates FOUC (Flash of Unstyled Content) across every screen
- **Custom Editorial Typography** — EB Garamond & Playfair Display font pairing inspired by Cahiers du Cinéma print aesthetics
- **Supabase Backend-as-a-Service** — authentication (email/password + Google OAuth), Postgres database, and object storage for avatars
- **Optimized List Rendering** — memoized components, virtualized feeds, and efficient re-render boundaries for smooth scrolling at scale
- **Guest Mode** — full browse experience without sign-up, backed by AsyncStorage for local persistence
- **Internationalization** — i18next-powered translations (French, English, Spanish)

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

## Environment Variables

Create a `.env` file at the project root with the following keys:

```env
# Supabase project credentials (required for authenticated mode)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> The app runs in **guest mode** if these variables are absent — no backend required to explore the UI.

## Project Architecture

```
ville-du-cinema-mobile/
├── App.tsx                     # Root entry — providers, splash screen, navigation
├── assets/                     # App icons, splash images, SVG assets
├── components/
│   ├── ui/                     # Reusable primitives (skeletons, buttons, inputs)
│   ├── feed/                   # Feed-specific components (review cards, filters)
│   ├── profile/                # Profile-specific components (avatar, stats)
│   └── settings/               # Settings-specific components
├── constants/                  # Static data (discovery users, filmmaker quotes)
├── contexts/                   # React Context providers (auth, theme, preferences)
├── hooks/                      # Custom hooks (useUser, useProfile, useUserLists)
├── lib/
│   ├── auth.ts                 # Portable auth abstraction layer
│   ├── storage.ts              # Portable storage abstraction (AsyncStorage)
│   └── supabase/               # Supabase client with Expo Secure Store
├── messages/                   # i18n translation files (fr, en, es)
├── navigation/
│   ├── RootNavigator.tsx       # Auth vs App conditional routing
│   ├── AuthStack.tsx           # Welcome → Login → Signup flow
│   ├── AppTabs.tsx             # Bottom tab navigator (Feed, Profile, Settings)
│   ├── FeedDrawerNavigator.tsx # Drawer overlay for feed filters
│   └── types.ts                # Navigation param list types
├── screens/                    # Full-page screen components
├── services/                   # API services (feed, external profiles, caching)
├── theme/                      # Design tokens and theme configuration
└── types/                      # Shared TypeScript type definitions
```

## Local Setup

### Prerequisites

- Node.js 18+
- Xcode 16+ (for iOS simulator)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/ville-du-cinema-mobile.git
cd ville-du-cinema-mobile

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Generate native projects
npx expo prebuild --clean

# 5. Run on iOS simulator
npm run ios
```

### Android

```bash
npm run android
```

---

<!-- APP_SCREENSHOTS: Add screenshots or screen recordings below -->
<!-- e.g., ![Feed](./docs/screenshots/feed.png) ![Profile](./docs/screenshots/profile.png) -->
