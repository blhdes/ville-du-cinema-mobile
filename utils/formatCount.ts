/**
 * Formats a social count for compact display: 1600 -> "1.6k", 12000 -> "12k",
 * 1200000 -> "1.2m". Mirrors the abbreviation convention used by Twitter/Instagram.
 */
export function formatCompactCount(count: number): string {
  const abs = Math.abs(count)
  if (abs < 1000) return String(count)

  const format = (value: number, suffix: string) => {
    const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
    return `${rounded}${suffix}`
  }

  if (abs < 1_000_000) return format(count / 1000, 'k')
  return format(count / 1_000_000, 'm')
}
