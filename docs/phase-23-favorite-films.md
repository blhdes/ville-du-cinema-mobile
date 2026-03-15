# Phase 23: Top 4 Favorite Films

## Context

Letterboxd profiles feature up to 4 "Favorite Films" posters. Our app currently scrapes bio, display name, and metadata from the profile HTML — but ignores the favorites section. This plan adds that scraping, updates the data model, and renders the posters in a horizontal row inside `ExternalProfileHeader`, positioned between the metadata/bio and the Letterboxd dots button.

---

## 1. HTML Scraping Strategy

**File:** `services/externalProfile.ts`

The favorites section lives in a `<section id="favourites">` on the profile page. We use a two-phase regex approach (consistent with the existing scraping style — no new dependencies):

### Phase 1 — Isolate the section
```typescript
const FAVOURITES_SECTION_REGEX = /<section\s+id="favourites"[^>]*>([\s\S]*?)<\/section>/i
```
This captures everything inside the favourites `<section>`, preventing false matches from other poster images on the page (recent activity, lists, etc.).

### Phase 2 — Extract poster images
```typescript
const POSTER_IMG_REGEX = /<img\s+[^>]*src="(https:\/\/a\.ltrbxd\.com\/resized\/[^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi
```
Within the isolated section, this matches each `<img>` tag that has:
- `src` pointing to Letterboxd's CDN (`a.ltrbxd.com/resized/...`) — the poster URL
- `alt` attribute — the film title (reused for accessibility labels)

The `g` flag enables matching all 4 posters. We cap at 4 and reset `lastIndex` after each call (standard `g`-flag hygiene to avoid stale state across calls).

### New extraction function
```typescript
function extractFavoriteFilms(html: string): FavoriteFilm[] {
  const sectionMatch = html.match(FAVOURITES_SECTION_REGEX)
  if (!sectionMatch) return []

  const sectionHtml = sectionMatch[1]
  const films: FavoriteFilm[] = []
  let match: RegExpExecArray | null

  while ((match = POSTER_IMG_REGEX.exec(sectionHtml)) !== null) {
    films.push({
      posterUrl: match[1],
      title: decodeEntities(match[2]),  // reuses existing decodeEntities()
    })
    if (films.length >= 4) break
  }
  POSTER_IMG_REGEX.lastIndex = 0
  return films
}
```

### Wiring into `fetchExternalProfileMeta`
- Call `extractFavoriteFilms(html)` after `extractProfileMetadata(html)` (line ~201)
- Add `favoriteFilms` to the `meta` object (line ~212)
- Add `favoriteFilms: []` to both error fallback returns (lines 197 and 226)

---

## 2. Data Model Updates

**File:** `services/externalProfile.ts`

```typescript
// New type
export interface FavoriteFilm {
  title: string
  posterUrl: string
}

// Updated interface
export interface ExternalProfileMeta {
  displayName: string
  bio: string
  location?: string
  websiteUrl?: string
  websiteLabel?: string
  twitterHandle?: string
  twitterUrl?: string
  favoriteFilms: FavoriteFilm[]    // <-- new field, always present (empty array = no favorites)
}
```

**Why an object instead of plain URL strings:** The `alt` text gives us the film title for free. We use it as the `accessibilityLabel` on each poster (screen reader support) at zero extra cost.

**Cache impact:** None — `CacheEntry` wraps `ExternalProfileMeta`, so the new field is cached automatically.

### Edge cases

| Scenario | Behavior |
|---|---|
| 0 favorites | `extractFavoriteFilms` returns `[]` → UI hides the section entirely |
| 1–3 favorites | Array has fewer items → posters render centered via `justifyContent: 'center'` |
| 4 favorites | Full row |
| Lazy-loaded `<img>` (no real `src`) | Regex only matches `a.ltrbxd.com` URLs → placeholder `src` is skipped |
| HTML entities in title | Handled by existing `decodeEntities()` |

---

## 3. UI Layout

**File:** `components/profile/ExternalProfileHeader.tsx`

### Props update
```typescript
import type { FavoriteFilm } from '@/services/externalProfile'

// Add to ExternalProfileHeaderProps:
favoriteFilms?: FavoriteFilm[]
```

### Poster sizing (2:3 aspect ratio)
```
contentWidth = screen width − 40 (existing value, line 49)
posterGap   = spacing.sm (8px)
posterWidth = (contentWidth − posterGap × 3) / 4
posterHeight = posterWidth × 1.5
```
On an iPhone 15 (393px): ~82px wide × ~123px tall — clean thumbnails.

### JSX placement
Insert between the metadata row (line 204) and the Letterboxd button (line 207):

```tsx
{favoriteFilms && favoriteFilms.length > 0 ? (
  <View style={styles.favoritesSection}>
    <Text style={styles.favoritesLabel}>FAVORITE FILMS</Text>
    <View style={styles.favoritesRow}>
      {favoriteFilms.map((film, index) => (
        <Image
          key={index}
          source={{ uri: film.posterUrl }}
          style={{
            width: posterWidth,
            height: posterHeight,
            borderRadius: 4,
          }}
          cachePolicy="memory-disk"
          accessibilityLabel={film.title}
        />
      ))}
    </View>
  </View>
) : null}
```

### StyleSheet additions
```typescript
favoritesSection: {
  alignSelf: 'stretch',
  marginTop: spacing.lg,          // 24px — matches bioWrapper spacing
  alignItems: 'center',
},
favoritesLabel: {
  fontFamily: fonts.body,
  fontSize: typography.magazineMeta.fontSize,      // 11
  lineHeight: typography.magazineMeta.lineHeight,  // 16
  letterSpacing: typography.magazineMeta.letterSpacing, // 1.5
  color: colors.secondaryText,
  textTransform: 'uppercase',
  marginBottom: spacing.sm,        // 8px between label and posters
},
favoritesRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: spacing.sm,                 // 8px between posters
},
```

The label reuses the `magazineMeta` typography — the same pattern as `@USERNAME` (line 270) and section headers elsewhere in the app.

---

## 4. Screen Wiring

**File:** `screens/ExternalProfileScreen.tsx`

Pass the new prop (line 108):
```tsx
<ExternalProfileHeader
  // ...existing props...
  favoriteFilms={meta?.favoriteFilms}
/>
```

No dependency array changes needed — `meta` is already a dependency of the `useMemo`.

---

## 5. Change Checklist

| File | Action | ~Lines |
|---|---|---|
| `services/externalProfile.ts` | Add `FavoriteFilm` interface, update `ExternalProfileMeta`, add `extractFavoriteFilms()`, wire into fetch, update error fallbacks | +30 |
| `components/profile/ExternalProfileHeader.tsx` | Add prop, poster sizing math, JSX section, 3 new styles | +35 |
| `screens/ExternalProfileScreen.tsx` | Pass `favoriteFilms` prop | +1 |

---

## 6. Verification

1. **Profile with 4 favorites** — e.g. `letterboxd.com/dave/`. All 4 posters visible, 2:3 ratio, horizontally centered.
2. **Profile with 0 favorites** — Section fully hidden, no empty space or label.
3. **Profile with 1–3 favorites** — Posters centered in the row (not left-aligned).
4. **Pull-to-refresh** — Favorites reload correctly after cache clear.
5. **Image caching** — Navigate away and back; posters load instantly on second visit.
6. **Long bio + favorites** — Verify favorites appear correctly below an expanded/collapsed bio.
