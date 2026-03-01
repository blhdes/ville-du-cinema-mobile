# Village du Cinema — Mobile

React Native (Expo SDK 55) companion app for [Village du Cinema](https://github.com/blhdes/ville-du-cinema-app), a vintage Letterboxd review aggregator with a Cahiers du Cinema brutalist aesthetic.

## Stack

- **Expo** SDK 55 / React Native 0.83 / React 19
- **TypeScript** 5.9 (strict mode)
- **React Navigation** 7 (native-stack + bottom-tabs)
- **Supabase** for auth, database, and storage
- **AsyncStorage** for guest mode / local persistence
- **Expo Secure Store** for encrypted token storage
- **i18next** for i18n (fr, en, es)

## Getting Started

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

The app runs in **guest mode** if these are absent.

### Run on iOS (Mac required)

```bash
npx expo run:ios
```

Builds natively with Xcode and installs on a connected iPhone or simulator.

### Run on Android

```bash
npx expo run:android
```

### Dev server (Expo Go — SDK 54 only)

```bash
npx expo start
```

> Note: Expo Go on the App Store currently supports SDK 54. This project uses SDK 55, so use `expo run:ios` or a development build instead.

## Project Structure

```
├── App.tsx                    # Root — SafeAreaProvider + GuestMode + RootNavigator
├── contexts/
│   └── GuestModeContext.tsx   # Guest mode flag (AsyncStorage-backed)
├── navigation/
│   ├── types.ts               # AuthStack / AppTabs / Root param lists
│   ├── AuthStack.tsx          # Welcome → Login → Signup
│   ├── AppTabs.tsx            # Feed / Profile / Settings (bottom tabs)
│   └── RootNavigator.tsx      # Auth vs App conditional routing
├── screens/
│   ├── WelcomeScreen.tsx      # Landing with branding + filmmaker quote
│   ├── LoginScreen.tsx        # Email/password + Google OAuth
│   ├── SignupScreen.tsx       # Registration with validation
│   ├── FeedScreen.tsx         # Feed placeholder (Phase 4)
│   ├── ProfileScreen.tsx      # Profile placeholder (Phase 4)
│   └── SettingsScreen.tsx     # Settings with sign out
├── hooks/
│   ├── useUser.ts             # Supabase auth state
│   ├── useProfile.ts          # Profile CRUD via API
│   ├── useUserLists.ts        # Followed users (guest + auth)
│   └── useDisplayPreferences.ts # UI prefs with optimistic updates
├── lib/
│   ├── auth.ts                # Portable auth abstraction
│   ├── storage.ts             # Portable storage abstraction (AsyncStorage)
│   └── supabase/client.ts     # Supabase client with Secure Store
├── constants/
│   ├── discoveryUsers.ts      # Curated Letterboxd accounts
│   └── filmmakerQuotes.ts     # Weekly rotating quotes
├── types/database.ts          # All Supabase/API types
└── messages/                  # i18n translations (fr, en, es)
```

## Architecture

Mirrors the [web app](https://github.com/blhdes/ville-du-cinema-app) architecture:

- **Portable abstraction layers** (`lib/auth.ts`, `lib/storage.ts`) allow swapping backends without touching hooks
- **Two-tier storage**: guest mode (AsyncStorage) and authenticated mode (Supabase via API routes)
- **Hooks layer**: `useUser` → `useProfile` → `useDisplayPreferences` — all client-side state lives in hooks
- **Conditional navigation**: `RootNavigator` shows `AuthStack` when logged out, `AppTabs` when authenticated or guest

## Design System

Cahiers du Cinema brutalist aesthetic matching the web app:

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#fdfaf3` | Aged paper cream |
| Foreground | `#1a1a1a` | Near black |
| Sepia | `#8c7851` | Secondary text |
| Accent | `#b22222` | Editorial red |
