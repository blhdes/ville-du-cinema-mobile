# Editorial Redesign Blueprint — Remaining Screens

## Design Tokens Reference

All screens share these values established in the Feed redesign:

| Token | Value | Usage |
|-------|-------|-------|
| `colors.background` | `#FCFAF8` | Every screen background — warm off-white |
| `colors.teal` | `#2E86AB` | Interactive text accents (links, active states) |
| `colors.red` | `#D7263D` | Destructive actions (sign out, remove) |
| `colors.yellow` | `#F2C14E` | Star ratings |
| `typography.magazineMeta` | 11px, uppercase, 1.5px tracking | Section labels, bylines, metadata |
| `typography.magazineTitle` | 28px Playfair Bold | Screen/section titles |
| `fonts.heading` | Playfair Display 700 | All headings |
| `fonts.body` / `bodyBold` | EB Garamond 400/700 | All body copy |
| Separators | `StyleSheet.hairlineWidth`, `colors.border` | Between all list items |
| Press feedback | `opacity: 0.6` | All interactive elements |

---

## 1. Profile Screen — "Author's Bio Page"

**Goal:** Transform from a chunky centered card into an elegant author page you'd find at the back of a literary journal.

### `screens/ProfileScreen.tsx`

| Current Problem | Change |
|-----------------|--------|
| `backgroundColor: colors.backgroundSecondary` (gray) | Switch to `colors.background` (warm off-white) |
| Header has `backgroundColor: colors.background` with border — looks like a nav bar | Remove background color and bottom border. Use `magazineTitle` for "Profile" heading, left-aligned with 20px horizontal padding |
| `nameSection` is center-aligned with tight spacing | Left-align everything. Display name uses `magazineTitle` (28px Playfair). Username and email become `magazineMeta` style (11px, uppercase, tracked) stacked below with `spacing.lg` vertical gap |
| `guestTitle` / `guestText` centered in a box | Keep centered but use `magazineTitle` for "Guest Mode" and `magazineBody` for the explanation text. Generous `spacing.xxl` padding |
| `followingSection` has `paddingTop: spacing.sm` | Increase to `spacing.xl` for visual breathing room before the directory |

### `components/profile/ProfileHeader.tsx`

| Current Problem | Change |
|-----------------|--------|
| Avatar is a 100px circle centered in the page | Shrink to **72px**. Left-align it alongside the name section (flex row) instead of center-stacking. This gives the "author portrait beside bio" magazine feel |
| `avatarPlaceholder` uses `backgroundSecondary` (gray fill) | Use `colors.background` with a 1px `colors.border` hairline circle. Initial letter in `fonts.heading`, muted `secondaryText` color |
| `bioText` is center-aligned body text | Left-align. Use `fonts.bodyItalic` (EB Garamond italic) at `magazineBody` size. Add `spacing.lg` top margin. This makes it feel like an author's pull quote |

**Proposed layout flow:**

```
[72px avatar]  [Display Name — magazineTitle]
               [@username — magazineMeta]
               [email — magazineMeta]

[Bio text in italic, left-aligned, generous top margin]

─────────────── hairline ───────────────

FOLLOWING (3)  — magazineMeta section label

username rows...
```

### `components/profile/FollowingList.tsx`

| Current Problem | Change |
|-----------------|--------|
| Wrapped in a `card` with `backgroundColor`, `borderRadius: 10` | Remove the card entirely. Rows sit flush on background with only hairline bottom borders |
| `sectionLabel` has `letterSpacing: 0.5` | Upgrade to full `magazineMeta` style: 11px, `letterSpacing: 1.5`, `colors.secondaryText` |
| `rowPressed` uses `backgroundColor: backgroundSecondary` | Switch to `opacity: 0.6` for consistency |
| `chevron` is a `>` character at 22px | Reduce to 18px, use `colors.secondaryText`. Or replace with a small right arrow in `magazineMeta` style for a cleaner editorial arrow |
| `username` is plain `fonts.body` 16px | Use `fonts.bodyBold` for the display name to give it weight. Keep handle as `magazineMeta` style |
| Row padding is 12px vertical, 16px horizontal | Increase to `spacing.md` (16px) vertical, 20px horizontal — matching the article padding from ReviewCard |
| `emptyText` sits inside the card | Remove card wrapper. Style as `magazineMeta` centered text |

---

## 2. Settings Screen — "HIG Meets Editorial"

**Goal:** Keep the familiar iOS grouped-list structure (users expect it in settings), but strip the heavy card look and infuse editorial typography.

### `screens/SettingsScreen.tsx`

| Current Problem | Change |
|-----------------|--------|
| `container` has `backgroundSecondary` (gray) | Switch to `colors.background` (warm off-white). The grouped-list gray background is no longer needed — sections are separated by whitespace and hairlines instead |
| Header matches Profile (centered, bordered) | Same treatment: remove border/bg, left-align, `fonts.heading` at `title3` size, 20px padding |
| `sectionLabel` has `letterSpacing: 0.5` | Upgrade to `magazineMeta`: 11px, 1.5px tracking, `secondaryText`. Add `spacing.xl` top padding for generous breathing room between sections |
| `card` has `backgroundColor`, `borderRadius: 10` | Remove background and border radius. Rows sit flush on the main background. Only hairline separators between rows |
| `signOutText` uses `colors.accent` (#FF2D55 — iOS pink) | Switch to `colors.red` (#D7263D — brand red). Use `magazineMeta` uppercase tracking style instead of plain body text. This makes it feel intentional rather than like a generic iOS button |
| `signOutSection` has `paddingTop: spacing.xl` | Increase to `spacing.xxl` (48px) for dramatic separation. Right-align or keep centered — both work editorially |
| `sectionFooter` is plain caption | Use `magazineMeta` style (11px, tracked) in `secondaryText` |
| `row` uses generic 12px padding | Increase to `spacing.md` vertical, 20px horizontal |

### `components/settings/DisplaySettings.tsx`

| Current Problem | Change |
|-----------------|--------|
| Wrapped in a `card` with `backgroundColor`, `borderRadius: 10` | Remove card. Rows sit flush. Keep hairline dividers between rows |
| `label` is `fonts.body` 16px | Keep as-is — readable body text is correct for settings labels |
| `description` is caption-sized gray text | Switch to `magazineMeta` style: 11px, 1.5px tracking, uppercase. This makes sub-labels feel editorial rather than like tooltip text |
| Slider `minimumTrackTintColor` is `secondaryText` (gray) | Change to `colors.teal` — brand accent for the active track. Keep `maximumTrackTintColor` as `colors.border` |
| Slider `thumbTintColor` is `colors.foreground` (near-black) | Switch to `colors.white` with the native shadow — cleaner on the warm background |
| `sliderIcon` / `sliderIconLarge` use `fonts.body` | Switch to `fonts.heading` (Playfair) for the "A" / "A" — these are typographic symbols, not body text |

### `components/ui/Toggle.tsx`

| Current Problem | Change |
|-----------------|--------|
| `trackColor.true` is `colors.blue` | Switch to `colors.teal` (same value currently, but semantically correct — use the brand token) |
| `ios_backgroundColor` is `colors.border` | Keep — this is the standard iOS off-state gray and looks correct |

---

## 3. User List Drawer — "Minimalist Sidebar Directory"

**Goal:** Transform from a chunky panel with thick input/button combos into an airy, magazine-style sidebar. Think of it as a table of contents or contributor index.

### `components/UserListPanel.tsx`

| Current Problem | Change |
|-----------------|--------|
| `content` has `padding: spacing.md` (16px all around) | Use 20px horizontal, `spacing.lg` (24px) top padding |
| **Input row** — `input` has `backgroundColor: backgroundSecondary`, `borderRadius: 10`, visible border | Remove background color (transparent on warm white). Remove border radius. Use only a single hairline bottom border — like an underlined text field in a luxury form. Keep `fonts.body` for the typed text |
| **Add button** — `backgroundColor: colors.blue`, `borderRadius: 10`, white text | Remove the filled button entirely. Replace with a text-only "ADD" label in `magazineMeta` style using `colors.teal`. On press, `opacity: 0.6`. This eliminates the heaviest visual element in the panel |
| `errorText` uses `colors.accent` (iOS pink) | Switch to `colors.red` (brand red), keep `magazineMeta` sizing |
| `modeText` is plain caption | Use `magazineMeta` style (11px, tracked, uppercase) |
| `sectionLabel` has `letterSpacing: 0.5` | Upgrade to full `magazineMeta`: `letterSpacing: 1.5`. Add `spacing.lg` top margin before each section |
| `userList` has `borderRadius: 10`, `backgroundColor: backgroundSecondary` | Remove background and border radius. Rows sit flush with only hairline bottom borders |
| `userRow` padding is 12px | Increase to `spacing.md` (16px) vertical, 20px horizontal |
| `username` is plain body text | Use `fonts.body` at `magazineBody` size — keep it readable. No change needed here |
| **Remove button** — `removeText` uses `colors.accent` (pink) | Switch to `colors.red` (brand red). Use `magazineMeta` uppercase style: "REMOVE" instead of "Remove" |
| `suggestionList` has `borderRadius: 10`, `backgroundColor: backgroundSecondary` | Same treatment as user list — flush, no background, hairline dividers only |
| `suggestionPressed` uses `backgroundColor: colors.border` (gray fill) | Switch to `opacity: 0.6` |
| `suggestionAction` ("Add") uses `colors.blue` in body size | Switch to `colors.teal`, `magazineMeta` uppercase style: "ADD" |
| `emptyText` is centered body text | Use `fonts.bodyItalic` for an editorial empty-state feel. Keep centered, `magazineBody` size |

**Proposed input area layout:**

```
[username field with hairline underline only____]  ADD

SYNCED WITH YOUR ACCOUNT  (magazineMeta, muted)

─────────────── hairline ───────────────

FOLLOWING (3)

username                              REMOVE
─────────────── hairline ───────────────
username                              REMOVE
─────────────── hairline ───────────────

DISCOVER

username                                 ADD
─────────────── hairline ───────────────
```

---

## Implementation Order

Recommended sequence to minimize visual inconsistency during development:

1. **Settings + DisplaySettings + Toggle** — smallest surface area, proves the "flush rows on warm white" pattern works for grouped lists
2. **Profile + ProfileHeader + FollowingList** — medium complexity, introduces the avatar-beside-name layout
3. **UserListPanel** — most changes (input field, buttons, two list sections), benefits from patterns established in steps 1-2

Each step is independent and can be committed separately.
