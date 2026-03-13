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

/** Decode common HTML entities that appear in scraped text. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&lrm;/gi, '')
    .replace(/&bull;/gi, '\u2022')
}

/**
 * Extract the full-text bio URL from the profile page, if present.
 * Letterboxd truncates long bios in the page HTML and provides a
 * `data-full-text-url` attribute to fetch the complete content via AJAX.
 */
function extractFullTextUrl(html: string): string | null {
  const bioSection = html.match(
    /<section\s+class="profile-person-bio[^"]*">([\s\S]*?)<\/section>/i
  )
  if (!bioSection) return null

  const urlMatch = bioSection[1].match(/data-full-text-url="([^"]+)"/i)
  if (!urlMatch) return null

  return `https://letterboxd.com${urlMatch[1]}`
}

/**
 * Extract the collapsed (truncated) bio HTML from the profile page.
 * Used as a fallback when the full-text endpoint is unavailable.
 */
function extractCollapsedBio(html: string): string {
  const bioSection = html.match(
    /<section\s+class="profile-person-bio[^"]*">([\s\S]*?)<\/section>/i
  )
  if (bioSection) {
    const collapsedMatch = bioSection[1].match(
      /<div\s+class="collapsed-text">\s*([\s\S]*?)\s*<\/div>/i
    )
    if (collapsedMatch) return collapsedMatch[1].trim()
  }

  // Fallback: meta description (plain text only)
  const metaMatch = html.match(
    /<meta\s+name="description"\s+content="([^"]*)"/i
  )
  if (metaMatch) {
    const bioPrefix = metaMatch[1].match(/Bio:\s*(.+)$/i)
    if (bioPrefix) return decodeEntities(bioPrefix[1].trim())
  }

  return ''
}

/**
 * Fetch the full bio HTML from Letterboxd's full-text endpoint.
 * Returns the inner HTML content, or null if the request fails.
 */
async function fetchFullBio(fullTextUrl: string): Promise<string | null> {
  try {
    const res = await fetch(fullTextUrl)
    if (!res.ok) return null

    const html = await res.text()
    // The endpoint returns a small HTML fragment. Extract the body content.
    // It may be a full page wrapper or just the raw HTML — handle both.
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const content = bodyMatch ? bodyMatch[1].trim() : html.trim()

    // If we got a Cloudflare challenge or empty response, bail out
    if (!content || content.includes('cf-browser-verification') || content.includes('challenge-platform')) {
      return null
    }

    return content
  } catch {
    return null
  }
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

    // Try to fetch the full untruncated bio from Letterboxd's AJAX endpoint.
    // Fall back to the collapsed (truncated) version from the page HTML.
    const fullTextUrl = extractFullTextUrl(html)
    let bio = extractCollapsedBio(html)
    if (fullTextUrl) {
      const fullBio = await fetchFullBio(fullTextUrl)
      if (fullBio) bio = fullBio
    }

    const meta: ExternalProfileMeta = {
      displayName: extractDisplayName(html),
      bio,
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

/** Clear the in-memory profile meta cache (used by pull-to-refresh). */
export function clearProfileCache(): void {
  profileCache.clear()
}
