import { Image } from 'expo-image'

interface ImdbBadgeProps {
  size?: number
}

const IMDB_LOGO = require('@/assets/imdb-logo.png')

export default function ImdbBadge({ size = 28 }: ImdbBadgeProps) {
  return (
    <Image
      source={IMDB_LOGO}
      style={{ width: size, height: size, borderRadius: size * 0.18 }}
      cachePolicy="memory-disk"
    />
  )
}
