import { memo, useCallback, useMemo, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { findMovieByTitle } from '@/services/tmdb'
import type { FeedStackParamList } from '@/navigation/types'
import type { Review } from '@/types/database'
import { useDisplayPreferences } from '@/hooks/useDisplayPreferences'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import EyeIcon from '@/components/ui/EyeIcon'

interface WatchNotificationProps {
  review: Review
  hideAuthor?: boolean
}

function WatchNotification({ review, hideAuthor = false }: WatchNotificationProps) {
  const { preferences } = useDisplayPreferences()
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const [titlePressed, setTitlePressed] = useState(false)
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const handleTitlePress = useCallback(async () => {
    const match = await findMovieByTitle(review.movieTitle)
    if (match) {
      navigation.navigate('FilmCard', { tmdbId: match.id, movieTitle: match.title })
    }
  }, [review.movieTitle, navigation])

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => Linking.openURL(review.link)}
    >
      <EyeIcon size={14} color={colors.secondaryText} />
      <View style={styles.content}>
        {!hideAuthor && (
          <Text
            style={styles.author}
            onPress={() => navigation.navigate('ExternalProfile', { username: review.username })}
            suppressHighlighting
            numberOfLines={1}
          >
            {review.creator}
          </Text>
        )}
        <Text style={styles.watchedLabel} numberOfLines={1}>Watched</Text>
        <Text
          style={[styles.movie, titlePressed && styles.moviePressed]}
          onPressIn={() => setTitlePressed(true)}
          onPressOut={() => setTitlePressed(false)}
          onPress={handleTitlePress}
          suppressHighlighting
          numberOfLines={1}
        >
          {review.movieTitle}
        </Text>
      </View>
      {review.rating && preferences.showRatings ? (
        <Text style={styles.rating}>{review.rating}</Text>
      ) : null}
    </Pressable>
  )
}

export default memo(WatchNotification)

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pressed: {
      opacity: 0.6,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    author: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    watchedLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    movie: {
      flex: 1,
      fontFamily: fonts.headingItalic,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.foreground,
    },
    moviePressed: {
      opacity: 0.6,
    },
    rating: {
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.yellow,
    },
  })
}
