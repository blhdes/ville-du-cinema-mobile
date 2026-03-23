# Letterboxd Compliance Audit

**Date:** 2026-03-21
**Status:** Pending — email Letterboxd, revisit after 1–2 weeks

---

## Summary

Village consumes Letterboxd data via two methods: RSS feeds and HTML scraping.
RSS is explicitly sanctioned by Letterboxd. HTML scraping violates ToS clause 6.11.

---

## Relevant ToS Clause

**Section 6.11:**

> Except as explicitly authorized in these Terms, you must not employ any robot,
> spider, scraper, deep-link, or other automated data gathering or extraction
> tool, program, or algorithm to access, acquire, copy, or monitor any portion
> of the Service.

Source: https://letterboxd.com/legal/terms-of-use/

---

## Letterboxd API Status

The official API is **private and available by request only**. It is not publicly available.

To apply, users must email with details of their intended use.

Letterboxd is **not granting access** for:
- Data-analysis, visualization, or recommendation projects
- LLM or GPT-related use
- Private or personal projects
- Usage that recreates current or planned paid subscription features

They note: "while we read all applications, we are unable to individually reply,
or to guarantee access."

Source: https://letterboxd.com/api-beta/

---

## Letterboxd's Sanctioned Alternatives (from API Beta Page)

Letterboxd explicitly offers these for non-API users:

- **RSS feeds** of individual member profiles (diary entries, reviews, lists)
- **Import/export facilities** in account settings
- **TMDB** for movie/TV metadata (cast, crew, synopsis, posters)

Source: https://letterboxd.com/api-beta/

---

## Current Data Access in Village — Full Detail

### Compliant — RSS Feed

| Data | Source | File |
|------|--------|------|
| Reviews, ratings, dates | `letterboxd.com/{user}/rss/` | `services/feed.ts:149-205` |
| Display names (`dc:creator`) | `letterboxd.com/{user}/rss/` | `services/feed.ts:135-147` |

RSS consumption is "explicitly authorized" per the API beta page.

**How RSS data is used:**

- `_fetchUserFeed(username)` fetches the RSS XML, parses with `fast-xml-parser`
- From each `<item>` it extracts: `title`, `link`, `description` (HTML review body), `pubDate`, `dc:creator`
- `extractRating(title)` — regex extracts star rating from title suffix: ` - ([★½]+)$`
- `extractMovieTitle(title)` — strips year and rating from title
- `cleanDescription(description)` — removes poster `<img>` and dangerous tags (script/style/form/etc.)
- Skips list activity entries (filters by `link.includes('/list/')`)
- Each item becomes a `Review` object with fields: `id`, `username`, `title`, `link`, `pubDate`, `creator`, `review`, `rating`, `movieTitle`, `type` ("review" or "watch"), `avatarUrl`
- Results are cached in-memory for 5 minutes via `feedCache` Map
- `fetchFeed(usernames[], page)` fetches multiple users in parallel, merges, sorts by date, paginates (PAGE_SIZE = 50)

### Non-Compliant — HTML Scraping

| Data | Source | File |
|------|--------|------|
| Avatar URLs | `letterboxd.com/{user}/` | `services/feed.ts:36-61` |
| Bio (full + collapsed) | `letterboxd.com/{user}/` | `services/externalProfile.ts:43-106` |
| Location, website, Twitter | `letterboxd.com/{user}/` | `services/externalProfile.ts:222-264` |
| Favorite film slugs/titles | `letterboxd.com/{user}/` | `services/externalProfile.ts:135-156` |
| Film poster URLs (JSON-LD) | `letterboxd.com/{filmLink}` | `services/externalProfile.ts:162-173` |
| Display name (from `<title>`) | `letterboxd.com/{user}/` | `services/externalProfile.ts:112-121` |

All of the above use regex extraction from HTML pages, which falls under
"scraper... automated data gathering or extraction tool" in clause 6.11.

**How each scraped item works in detail:**

#### Avatar URLs (`services/feed.ts:23-93`)

- `fetchAvatarUrl(username)` fetches `https://letterboxd.com/{username}/`
- `extractAvatarUrl(html)` tries two regexes:
  1. Letterboxd CDN: `src="(https://a.ltrbxd.com/resized/avatar/...-0-220-0-220-crop...)"`
  2. Gravatar fallback: `src="(https://secure.gravatar.com/avatar/...size=220...)"`
- `refreshAvatarUrls(usernames[])` bypasses cache, fetches all in parallel, batch-writes to `avatarCache`, persists to AsyncStorage
- Caching: in-memory + AsyncStorage sync in `services/avatarCache.ts`

#### Profile Metadata (`services/externalProfile.ts:270-311`)

`fetchExternalProfileMeta(username)` fetches `https://letterboxd.com/{username}/` and extracts:

**Display Name** (Lines 112-121):
- From `<title>` tag: regex `/<title>([^<]*)<\/title>/i`
- Parses format: `"Name's profile • Letterboxd"` → `"Name"`
- Decodes HTML entities (`&#039;`, `&amp;`, etc.)

**Bio** — two-step process:
1. Check for full bio URL via `extractFullTextUrl(html)` (Lines 43-53):
   - Regex on `<section class="profile-person-bio...">`
   - Extracts `data-full-text-url="..."` attribute
   - Constructs: `https://letterboxd.com{urlMatch[1]}`
2. `fetchFullBio(fullTextUrl)` (Lines 86-106):
   - Makes AJAX call to the full-text endpoint
   - Parses HTML response body
   - Falls back to `extractCollapsedBio(html)` if endpoint fails
3. Collapsed bio fallback (Lines 59-80):
   - Extracts `<div class="collapsed-text">` inner HTML
   - Falls back to `<meta name="description">` if section missing

**Location, Website, Twitter** (Lines 222-264):
- Extracts from `<div class="profile-metadata">` block
- Uses SVG `viewBox` dimensions to identify icon type:
  - `viewBox="0 0 8 16"` = pin icon → location
  - `viewBox="0 0 14 16"` = cursor icon → website (URL + label)
  - `viewBox="0 0 15 16"` = X icon → Twitter (URL + handle)

**Favorite Films** (Lines 135-198):
1. `extractFavoriteSlugs(html)` — regex on `<section id="favourites">`:
   - Loops through: `data-item-slug`, `data-item-link`, `data-item-full-display-name`
   - Extracts up to 4 films
2. For each film, `fetchPosterUrl(filmLink)`:
   - Fetches `https://letterboxd.com{filmLink}`
   - Extracts poster URL from JSON-LD: `/"image"\s*:\s*"([^"]+)"/`
3. All 4 resolved in parallel → `FavoriteFilm[]` objects: `{ title, posterUrl }`

Caching: 5-minute in-memory TTL in `profileCache` Map, cleared on pull-to-refresh.

**Return type:** `ExternalProfileMeta`:
```typescript
{
  displayName: string
  bio: string
  location?: string
  websiteUrl?: string
  websiteLabel?: string
  twitterHandle?: string
  twitterUrl?: string
  favoriteFilms: Array<{ title: string; posterUrl: string }>
}
```

---

## No Other External APIs

Village makes no TMDB, IMDB, OpenAI, or other third-party API calls. The app is purely:
1. **Letterboxd** (RSS + HTML scraping)
2. **Supabase** (user data, auth, clippings storage)
3. **Google OAuth** (authentication)

---

## Supabase Storage — What Letterboxd Data is Stored?

No raw Letterboxd data is stored in the database. The only stored data is user-created:

**Table `user_clippings`:**
- `quote_text` — user-selected excerpt from a review
- `movie_title` — movie name
- `author_name` — reviewer's name
- `original_url` — link back to the Letterboxd review
- `type` — "quote" or "repost"
- `review_json` — full Review object (for reposts, serialized from RSS data)

All other Letterboxd data (feeds, profiles, avatars) is fetched live and cached
only in-memory or AsyncStorage (client-side, ephemeral).

---

## Proposed Replacements (if needed)

| Scraped Data | Replacement | Notes |
|---|---|---|
| Avatars | Generated initials or placeholder | Village users already have their own avatars |
| Bio, location, website, twitter | "View on Letterboxd" button that opens browser | Same info, no scraping, better UX for linking out |
| Favorite films + poster images | Free TMDB API key, fetch posters directly | Letterboxd themselves recommend TMDB on the API beta page |
| Display name (from HTML `<title>`) | Already available from RSS `dc:creator` field | No change needed, just stop fetching from HTML |

---

## Apple App Store Risk Assessment

**Low risk (keep as-is):**
- RSS feed consumption — standard public data format, explicitly sanctioned by Letterboxd

**Medium risk (mitigate):**
- Add "Data from Letterboxd" attribution in app with a link
- Add disclaimer in App Store description that Village is not affiliated with Letterboxd

**Higher risk (replace if Letterboxd objects):**
- HTML scraping of profiles — directly violates ToS 6.11
- Poster images — pass-through from TMDB via Letterboxd without own license is legally murky
- Apple can reject if: content owner files a complaint, content is presented as official integration, or third-party content is displayed without authorization

---

## Action Items

- [ ] Email Letterboxd describing Village's use case (RSS + profile display)
- [ ] Wait 1–2 weeks for response (target: ~2026-04-04)
- [ ] If no response or denied: implement replacements listed above
- [ ] Add "Data from Letterboxd" attribution in app
- [ ] Consider obtaining own TMDB API key for poster images
- [ ] Read full ToS in browser (automated fetch returned 403) to check for additional relevant clauses
