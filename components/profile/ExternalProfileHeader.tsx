import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import ExpandableAvatar from '@/components/ui/ExpandableAvatar'
import FollowButton from '@/components/ui/FollowButton'
import FeedDivider from '@/components/ui/FeedDivider'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

interface ExternalProfileHeaderProps {
  displayName: string
  username: string
  isFollowing: boolean
  onFollowToggle: () => void
}

const AVATAR_SIZE = 72

export default function ExternalProfileHeader({
  displayName,
  username,
  isFollowing,
  onFollowToggle,
}: ExternalProfileHeaderProps) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const letterboxdUrl = `https://letterboxd.com/${username}/`

  return (
    <View style={styles.container}>
      {/* Avatar — initials placeholder (no scraped avatar) */}
      <View style={styles.avatarWrapper}>
        <ExpandableAvatar
          displayName={displayName}
          username={username}
          size={AVATAR_SIZE}
        />
      </View>

      {/* Display name */}
      <Pressable
        style={styles.displayNameRow}
        onPress={() => Linking.openURL(letterboxdUrl)}
      >
        <Text style={styles.displayName}>{displayName}</Text>
        <View style={styles.dotsOffset}>
          <LetterboxdDots size={22} />
        </View>
      </Pressable>

      {/* @username */}
      <Text
        style={styles.username}
        onPress={() => Linking.openURL(letterboxdUrl)}
        suppressHighlighting
      >
        @{username}
      </Text>

      {/* View on Letterboxd link — replaces scraped bio/metadata */}
      <Pressable
        style={styles.viewOnLetterboxd}
        onPress={() => Linking.openURL(letterboxdUrl)}
      >
        <Text style={styles.viewOnLetterboxdText}>View full profile on Letterboxd</Text>
      </Pressable>

      {/* Follow / Following */}
      <FollowButton
        isFollowing={isFollowing}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onFollowToggle()
        }}
        style={styles.followButtonMargin}
      />

      <View style={{ marginTop: spacing.xl }}>
        <FeedDivider />
      </View>
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: spacing.xl,
    },
    avatarWrapper: {
      marginBottom: spacing.md,
    },
    displayNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dotsOffset: {
      marginTop: 2,
    },
    displayName: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
    },
    username: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 2,
    },
    viewOnLetterboxd: {
      marginTop: spacing.md,
    },
    viewOnLetterboxdText: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
      color: colors.teal,
    },
    followButtonMargin: {
      marginTop: spacing.md,
    },
  })
}
