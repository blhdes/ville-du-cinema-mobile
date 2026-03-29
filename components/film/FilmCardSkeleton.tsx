import { useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/contexts/ThemeContext'
import { spacing } from '@/theme'

const POSTER_WIDTH = 110
const POSTER_HEIGHT = POSTER_WIDTH * 1.5
const BACKDROP_HEIGHT = 200
const HORIZONTAL_PAD = 20

export default function FilmCardSkeleton() {
  const { colors } = useTheme()
  const pulse = useSharedValue(0.4)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )
  }, [pulse])

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))
  const b = colors.border // bone color shorthand

  return (
    <ScrollView
      style={styles.container}
      scrollEnabled={false}
      contentContainerStyle={styles.content}
    >
      <Animated.View style={pulseStyle}>

        {/* ---- Backdrop ---- */}
        <View style={[styles.backdrop, { backgroundColor: b }]} />

        {/* ---- Poster + title block ---- */}
        <View style={styles.headerRow}>
          <View style={[styles.poster, { backgroundColor: b }]} />
          <View style={styles.headerText}>
            <View style={[styles.bone, { width: '80%', height: 26, borderRadius: 5, backgroundColor: b }]} />
            <View style={[styles.bone, { width: '55%', height: 11, borderRadius: 3, marginTop: 10, backgroundColor: b }]} />
            <View style={[styles.bone, { width: '65%', height: 11, borderRadius: 3, marginTop: 7, backgroundColor: b }]} />
          </View>
        </View>

        {/* ---- Genre labels ---- */}
        <View style={styles.genreRow}>
          <View style={[styles.bone, { width: 200, height: 11, borderRadius: 3, backgroundColor: b }]} />
        </View>

        {/* ---- Synopsis ---- */}
        <View style={styles.section}>
          <View style={[styles.bone, { width: 90, height: 18, borderRadius: 4, marginBottom: spacing.sm, backgroundColor: b }]} />
          <View style={[styles.bone, { width: '100%', height: 13, borderRadius: 3, marginBottom: 8, backgroundColor: b }]} />
          <View style={[styles.bone, { width: '100%', height: 13, borderRadius: 3, marginBottom: 8, backgroundColor: b }]} />
          <View style={[styles.bone, { width: '90%', height: 13, borderRadius: 3, marginBottom: 8, backgroundColor: b }]} />
          <View style={[styles.bone, { width: '60%', height: 13, borderRadius: 3, backgroundColor: b }]} />
        </View>

        {/* ---- Cast ---- */}
        <View style={styles.section}>
          <View style={[styles.bone, { width: 60, height: 18, borderRadius: 4, marginBottom: spacing.sm, backgroundColor: b }]} />
          <View style={styles.castGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.castItem}>
                <View style={[styles.bone, { width: '80%', height: 13, borderRadius: 3, marginBottom: 5, backgroundColor: b }]} />
                <View style={[styles.bone, { width: '50%', height: 10, borderRadius: 3, backgroundColor: b }]} />
              </View>
            ))}
          </View>
        </View>

        {/* ---- Watchlist buttons ---- */}
        <View style={styles.section}>
          <View style={styles.watchlistRow}>
            <View style={[styles.watchlistBtn, { backgroundColor: b }]} />
            <View style={[styles.watchlistBtn, { backgroundColor: b }]} />
          </View>
        </View>

        {/* ---- Action rows ---- */}
        <View style={styles.section}>
          <View style={[styles.bone, { width: 140, height: 18, borderRadius: 3, backgroundColor: b }]} />
        </View>
        <View style={styles.section}>
          <View style={[styles.bone, { width: 160, height: 18, borderRadius: 3, backgroundColor: b }]} />
        </View>

      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  bone: {
    // base — caller always provides width/height/borderRadius/backgroundColor
  },
  backdrop: {
    width: '100%',
    height: BACKDROP_HEIGHT,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PAD,
    marginTop: -40,
    gap: spacing.md,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
    paddingTop: 44,
  },
  genreRow: {
    paddingHorizontal: HORIZONTAL_PAD,
    marginTop: spacing.md,
  },
  section: {
    paddingHorizontal: HORIZONTAL_PAD,
    marginTop: spacing.lg,
  },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  castItem: {
    width: '47%',
  },
  watchlistRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  watchlistBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
  },
})
