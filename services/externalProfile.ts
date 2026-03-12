import type { Review } from '@/types/database'
import { fetchUserFeed } from '@/services/feed'

export interface ExternalProfileMeta {
  displayName: string
  bio: string
  location?: string
  websiteUrl?: string
  websiteLabel?: string
  twitterHandle?: string
  twitterUrl?: string
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  meta: ExternalProfileMeta
  fetchedAt: number
}

const profileCache = new Map<string, CacheEntry>()

interface FeedCacheEntry {
  reviews: Review[]
  fetchedAt: number
}

const feedCache = new Map<string, FeedCacheEntry>()

/** Decode common HTML entities that appear in scraped text. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&lrm;/gi, '')
}

/**
 * Extract bio text from the profile page HTML.
 * Primary: the collapsible bio div inside <div class="bio js-bio">.
 * Fallback: <meta name="description" content="..."> (includes "Bio:" prefix).
 */
function extractBio(html: string): string {
  // The bio lives in a div with classes like "js-collapsible-text body-text -small -reset js-bio-content"
  // or just "body-text" inside <div class="bio js-bio">
  const bioBlockMatch = html.match(
    /<div\s+class="bio\s+js-bio">\s*([\s\S]*?)<\/div>\s*<\/div>/i
  )
  if (bioBlockMatch) {
    const raw = bioBlockMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    return decodeEntities(raw)
  }

  // Fallback: meta description — extract just the "Bio: ..." portion if present
  const metaMatch = html.match(
    /<meta\s+name="description"\s+content="([^"]*)"/i
  )
  if (metaMatch) {
    const bioPrefix = metaMatch[1].match(/Bio:\s*(.+)$/i)
    return bioPrefix ? decodeEntities(bioPrefix[1].trim()) : ''
  }

  return ''
}

/**
 * Extract display name from the <title> tag.
 * Letterboxd titles look like: "Name's profile • Letterboxd"
 */
function extractDisplayName(html: string): string {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  if (!titleMatch) return ''

  const decoded = decodeEntities(titleMatch[1])
  return decoded
    .replace(/[''\u2019]s profile\b/i, '')
    .replace(/\s*[•·\-|]\s*Letterboxd.*$/i, '')
    .trim()
}

/**
 * Extract location, website, and Twitter/X from the profile-metadata section.
 *
 * The HTML structure is:
 *   <div class="profile-metadata js-profile-metadata">
 *     <div class="metadatum -has-label">          ← location (not a link)
 *       <svg ... viewBox="0 0 8 16" />            ← pin icon
 *       <span class="label">City</span>
 *     </div>
 *     <a class="metadatum -has-label" href="...">  ← website
 *       <svg ... viewBox="0 0 14 16" />            ← cursor icon
 *       <span class="label">site.com</span>
 *     </a>
 *     <a class="metadatum -has-label" href="...">  ← twitter/X
 *       <svg ... viewBox="0 0 15 16" />            ← X icon
 *       <span class="label">handle</span>
 *     </a>
 *   </div>
 *
 * We identify each metadatum by the SVG viewBox dimensions since the
 * elements don't have distinguishing class names.
 */
function extractProfileMetadata(html: string): {
  location?: string
  websiteUrl?: string
  websiteLabel?: string
  twitterHandle?: string
  twitterUrl?: string
} {
  // Grab the entire profile-metadata block
  const metadataBlock = html.match(
    /<div\s+class="profile-metadata[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
  )
  if (!metadataBlock) return {}

  const block = metadataBlock[0]
  const result: ReturnType<typeof extractProfileMetadata> = {}

  // Split on each metadatum element boundary. Each one is either a <div> or <a>
  // with class "metadatum". We identify them by the SVG viewBox inside.
  const metadatumPattern = /(<(?:div|a)\s+class="metadatum[\s\S]*?(?:<\/div>|<\/a>))/gi
  const items = block.match(metadatumPattern) ?? []

  for (const item of items) {
    const labelMatch = item.match(/<span\s+class="label">([^<]+)<\/span>/i)
    const label = labelMatch ? labelMatch[1].trim() : ''

    if (item.includes('viewBox="0 0 8 16"')) {
      // Location (pin icon) — always a <div>, no href
      result.location = label
    } else if (item.includes('viewBox="0 0 14 16"')) {
      // Website (cursor icon) — an <a> with href
      const hrefMatch = item.match(/href="([^"]+)"/i)
      if (hrefMatch) result.websiteUrl = hrefMatch[1].trim()
      result.websiteLabel = label
    } else if (item.includes('viewBox="0 0 15 16"')) {
      // Twitter/X (X icon) — an <a> with href
      const hrefMatch = item.match(/href="([^"]+)"/i)
      if (hrefMatch) result.twitterUrl = hrefMatch[1].trim()
      result.twitterHandle = label
    }
  }

  return result
}

/**
 * Scrape profile metadata (bio, display name, location, website, twitter)
 * from a Letterboxd profile page. Results are cached in memory for 5 minutes.
 */
export async function fetchExternalProfileMeta(
  username: string
): Promise<ExternalProfileMeta> {
  const cached = profileCache.get(username)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.meta
  }

  try {
    const res = await fetch(`https://letterboxd.com/${username}/`)
    if (!res.ok) return { displayName: '', bio: '' }

    const html = await res.text()
    const { location, websiteUrl, websiteLabel, twitterHandle, twitterUrl } =
      extractProfileMetadata(html)

    const meta: ExternalProfileMeta = {
      displayName: extractDisplayName(html),
      bio: extractBio(html),
      location,
      websiteUrl,
      websiteLabel,
      twitterHandle,
      twitterUrl,
    }

    profileCache.set(username, { meta, fetchedAt: Date.now() })
    return meta
  } catch (err) {
    console.error(`Failed to fetch profile for ${username}:`, err)
    return { displayName: '', bio: '' }
  }
}

/**
 * Fetch a user's review feed with in-memory caching (5-min TTL).
 * Back-then-forward navigation returns cached data instantly.
 */
export async function fetchCachedUserFeed(
  username: string
): Promise<Review[]> {
  const cached = feedCache.get(username)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.reviews
  }

  const reviews = await fetchUserFeed(username)
  feedCache.set(username, { reviews, fetchedAt: Date.now() })
  return reviews
}

/** Clear both in-memory caches (used by pull-to-refresh). */
export function clearProfileCache(): void {
  profileCache.clear()
  feedCache.clear()
}
