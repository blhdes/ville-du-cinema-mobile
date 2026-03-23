# Village — The Social Layer

**Status:** Vision & Roadmap
**Branch:** feature/tos-compliant-rebuild

---

## The Core Idea

Right now Village has two types of content:

- **Imported** — RSS reviews and watches from Letterboxd users you follow
- **Native** — Clippings and reposts created inside Village

The new identity doubles down on native content and makes the **film** the center of gravity for everything. Not the user's profile. Not the feed. The film.

Every piece of content in Village — a Take, a clipping, a review, a comment — orbits a specific movie. TMDB gives us the backbone (poster, cast, synopsis, trailer, genre, recommendations). Letterboxd gives us the critical voice through RSS. Village provides the social glue between them.

> Village is not a Letterboxd companion. It's a social cinema layer — a place where film lovers build their own voice, share thoughts about movies, and connect with others who care about film as culture.

---

## What We're Building

### 1. Film Cards (TMDB-powered)

The atomic unit of Village. Every post, clipping, and conversation is anchored to a Film Card.

A Film Card contains:
- Poster, title, year, director, runtime (TMDB)
- Genre tags, TMDB audience score
- Synopsis (collapsible)
- Trailer deep link (YouTube via TMDB)
- **Village activity** — Takes, Clippings, and RSS reviews from your network about this film
- "View on Letterboxd" deep link — sends users to Letterboxd for full community data

Film Cards are not static pages. They're living conversation hubs. The more people you follow, the richer each Film Card becomes.

---

### 2. Takes — Village's Native Post Format

A **Take** is a short-form post about a specific film. Think X/Threads, but every post is anchored to a movie.

- 280 characters max
- Always attached to a TMDB film (required, not optional)
- Shown in the Village Feed, on the Film Card, and on the author's profile
- Can be liked and commented on
- Shareable as an image card (like the existing QuotePreview)

Takes are the missing link between Letterboxd's long-form criticism and social media's quick reactions. A clipping is a quote from someone else. A Take is your own voice.

---

### 3. Likes & Comments

Simple social mechanics anchored to Takes (and optionally Clippings):

**Likes** — a heart. Lightweight signal that something resonated.

**Comments** — reply threads under Takes. Short-form, flat structure (no nested threads for now). The goal is quick exchanges, not essay debates.

Both live in Supabase. Both are Village-native — no Letterboxd dependency.

---

### 4. Saved Films / Watchlist

A native watchlist powered by TMDB. Two states per film:

- **Want to watch** — saved for later
- **Seen it** — a lightweight watch marker (not a rating system — Village isn't trying to be Letterboxd)

Saved films power TMDB's recommendation engine on the Discover tab. They also appear on your profile as a "Watchlist" section.

---

### 5. Favorite Films (Profile section)

Replace the scraped Letterboxd top-4 with a Village-native favorite films grid. Users pick up to 4 films from TMDB search. Displayed as a 2×2 poster grid on the profile, below the bio/metadata row.

This was one of the most expressive parts of the external profile screen. Now it's owned by the user, not scraped.

---

### 6. Discovery Tab (New)

A dedicated tab for finding films and people. Replaces the current empty space in the navigation.

Sections:
- **Trending this week** — TMDB trending endpoint
- **In your network** — films your followed users have recently reviewed, posted about, or saved
- **Because you saved X** — TMDB recommendations based on your watchlist
- **Search** — unified search for films (TMDB) and Village users (Supabase)

The Discovery tab is where Village becomes a product in its own right, not just a feed reader.

---

### 7. Evolved Village Feed

Currently the feed mixes RSS reviews and Clippings in a single timeline. With Takes entering the picture, the feed gets two clear visual lanes:

**RSS lane** — Letterboxd reviews and watches from followed Letterboxd users. Existing cards, unchanged.

**Village lane** — Takes, Clippings, and Reposts from followed Village users. Native content, Village identity.

These can be rendered in a unified chronological feed with visual distinction (e.g. a subtle color or icon difference between RSS and Village content), or split into two toggleable tabs within the Feed screen. TBD on implementation.

---

### 8. Clippings → Film-Anchored

Clippings already exist. The evolution: when saving a clipping from a review, also store the TMDB film ID (by matching the movie title at save time, or via a search modal). This makes clippings appear on Film Cards alongside Takes, turning the Film Card page into a true aggregation of everything your network has said or clipped about a movie.

Backwards compatible — existing clippings without a tmdb_id still work, they just don't surface on Film Cards.

---

## Navigation

Current: `Feed | Profile | Settings`

Proposed: `Feed | Discover | Profile | Settings`

The **Discover** tab is new. The **Feed** tab gains Takes in the Village lane. The **Profile** tab gains Favorite Films, Watchlist, and a Takes section alongside Clippings.

New screens to add:
- `FilmCard` — the TMDB film hub screen
- `CreateTake` — compose a Take (film search → write)
- `TakeDetail` — full Take + comment thread
- `Discover` — trending, network activity, recommendations, search
- `Watchlist` — saved films grid

---

## Database — New Tables

```sql
-- Takes: short posts anchored to a film
create table takes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  tmdb_id     integer not null,
  content     text not null check (char_length(content) <= 280),
  created_at  timestamptz default now()
);

-- Likes on Takes
create table take_likes (
  user_id   uuid references auth.users not null,
  take_id   uuid references takes not null,
  created_at timestamptz default now(),
  primary key (user_id, take_id)
);

-- Comments on Takes
create table take_comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  take_id    uuid references takes not null,
  content    text not null check (char_length(content) <= 280),
  created_at timestamptz default now()
);

-- Saved Films (watchlist + seen)
create table saved_films (
  user_id    uuid references auth.users not null,
  tmdb_id    integer not null,
  status     text not null check (status in ('want', 'seen')),
  saved_at   timestamptz default now(),
  primary key (user_id, tmdb_id)
);

-- Favorite Films (profile top-4)
create table favorite_films (
  user_id   uuid references auth.users not null,
  tmdb_id   integer not null,
  position  integer not null check (position between 1 and 4),
  primary key (user_id, position)
);
```

All tables need RLS policies: users can read public content, only write their own rows.

For `user_clippings`, add a nullable `tmdb_id integer` column to enable film anchoring.

---

## TMDB Integration

TMDB API is free for non-commercial use and explicitly open for apps like Village.

Key endpoints:
- `GET /movie/{id}` — full film details
- `GET /search/movie?query=` — film search (for Take creation, Favorite Films picker)
- `GET /trending/movie/week` — Discovery tab
- `GET /movie/{id}/recommendations` — personalized suggestions
- `GET /movie/{id}/videos` — trailer links
- `GET /movie/{id}/credits` — cast and director

A dedicated `services/tmdb.ts` file will handle all TMDB calls with a shared API key (stored in `.env` / EAS secrets), response caching, and typed return shapes.

---

## Implementation Phases

### Phase 1 — TMDB Foundation
`services/tmdb.ts` + `FilmCardScreen` (poster, details, trailer link, "View on Letterboxd"). No social features yet — just the film hub.

### Phase 2 — Takes
`CreateTakeScreen` + Takes in the Village Feed + Takes section on Profile. The core social primitive.

### Phase 3 — Likes & Comments
`TakeDetailScreen` with comment thread. Like button on Take cards in the feed.

### Phase 4 — Discovery Tab
`DiscoverScreen` with trending, network activity, and TMDB recommendations. Unified search.

### Phase 5 — Watchlist & Favorite Films
`SavedFilmsScreen` + Favorite Films picker on Edit Profile + poster grid on ProfileHeader.

### Phase 6 — Film-Anchored Clippings
Add `tmdb_id` to `user_clippings`. Surface clippings on Film Cards.

---

## What This Gives Village

| Feature | Before | After |
|---|---|---|
| Content types | RSS reviews + Clippings | RSS reviews + Clippings + Takes + Comments |
| Movie data | Title string only | Full TMDB card (poster, cast, trailer…) |
| Profile | Bio + Letterboxd mirror | Bio + Metadata + Favorites + Watchlist + Takes |
| Discovery | None | Trending + Network activity + Recommendations |
| Social mechanics | None | Likes + Comments |
| Identity | Letterboxd companion | Standalone cinema social layer |

The RSS feed stays. Letterboxd gets traffic via deep links. Village gets its own soul.
