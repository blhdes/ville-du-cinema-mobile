# Profile Metadata Fields

**Status:** Planned
**Scope:** Village native profiles only — all data is user-entered, nothing scraped

---

## Goal

Add optional metadata fields to the Village user profile:
- **Location** (free text)
- **Website** (URL + display label)
- **X / Twitter** (handle)
- **Letterboxd** (username — links out to their profile)

These replace the scraped equivalents that were removed from `ExternalProfileScreen`.
They will appear on `ProfileScreen` (own profile) and `NativeProfileScreen` (other users).
All fields are optional and configurable via `EditProfileScreen`.

---

## Files to Change

```
[supabase/migrations/]         → New migration to add columns to user_data
[types/database.ts]            → Add new fields to UserData, UserProfile, PublicProfile
[hooks/useProfile.ts]          → Include new fields in updateProfile
[screens/EditProfileScreen.tsx] → New input fields (location, website, X, Letterboxd)
[components/profile/ProfileHeader.tsx] → Display metadata row below bio
[screens/NativeProfileScreen.tsx] → Pass new fields through to ProfileHeader
```

---

## 1. Database Migration

New nullable columns on `user_data`:

```sql
alter table user_data
  add column if not exists location       text,
  add column if not exists website_url    text,
  add column if not exists website_label  text,
  add column if not exists twitter_handle text,
  add column if not exists letterboxd_username text;
```

No RLS changes needed — existing policies already cover these columns.

---

## 2. Type Updates (`types/database.ts`)

Add to `UserData.Row`, `UserDataInsert`, `UserDataUpdate`, `UserProfile`, and `PublicProfile`:

```ts
location?: string | null
website_url?: string | null
website_label?: string | null
twitter_handle?: string | null
letterboxd_username?: string | null
```

---

## 3. Hook (`hooks/useProfile.ts`)

Extend the `updateProfile` data parameter to accept the five new fields. No other logic change needed — Supabase upsert will handle them automatically.

---

## 4. Edit Profile Screen (`screens/EditProfileScreen.tsx`)

Add five new `useState` entries (initialized from `profile`), and a new section in the `ScrollView` below the Bio field. Keep the same `fieldGroup` / `label` / `input` pattern already in use.

Fields and their UX notes:

| Field | Input type | Validation | Placeholder |
|---|---|---|---|
| Location | Plain text | None, max 60 chars | `City, Country` |
| Website URL | URL keyboard | Must start with `https://` or `http://` | `https://yoursite.com` |
| Website label | Plain text | Optional, max 40 chars | `yoursite.com` |
| X / Twitter handle | Plain text | Strip leading `@` on save | `@yourhandle` |
| Letterboxd username | Plain text | Strip leading `@` and trailing `/` on save | `letterboxd_username` |

Include all five in the `updateProfile` call inside `handleSave`.

---

## 5. Profile Header (`components/profile/ProfileHeader.tsx`)

Add a metadata row below the bio, matching the visual style used in the old `ExternalProfileHeader`:

- **Location** → `Ionicons` `location-sharp` icon + plain text label (non-tappable)
- **Website** → `globe-outline` icon + tappable label → `WebBrowser.openBrowserAsync(website_url)`
- **X / Twitter** → `𝕏` unicode glyph + tappable handle → `Linking.openURL('https://x.com/{handle}')`
- **Letterboxd** → `LetterboxdDots` component + tappable username → `Linking.openURL('https://letterboxd.com/{username}/')`

Only render the row if at least one field is set.
`ProfileHeader` currently receives a full `UserProfile` — all new fields will be available there directly. No prop drilling needed.

---

## 6. Native Profile Screen (`screens/NativeProfileScreen.tsx`)

`NativeProfileScreen` fetches a `VillagePublicProfile` from Supabase for other users.
Update the `.select()` query to include the five new columns so they appear on other people's profiles too.

---

## Visual Reference

The metadata row UI was already implemented and working in `components/profile/ExternalProfileHeader.tsx` (now simplified). The styles and interaction patterns from that component can be reused directly in `ProfileHeader`.

Row layout: horizontal, `flexWrap: 'wrap'`, centered, gap between items. Each item is an icon + label, tappable where applicable.

---

## Notes

- Website URL input should use `keyboardType="url"` and `autoCapitalize="none"`
- X handle: strip `@` prefix before saving, display with `@` in the UI
- Letterboxd username: strip `@` prefix and trailing `/` before saving
- All fields optional — a user with none set sees no metadata row (no empty space)
- The Letterboxd link is a deep link out to the browser — no data fetched, fully compliant
