import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import { fetchDisplayName } from '@/services/feed'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useUserLists } from '@/hooks/useUserLists'
import type { FeedStackParamList } from '@/navigation/types'
import type { FollowedVillageUser } from '@/types/database'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import Spinner from '@/components/ui/Spinner'
import LogoIcon from '@/components/ui/LogoIcon'
import LetterboxdDots from '@/components/ui/LetterboxdDots'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchNav = NativeStackNavigationProp<FeedStackParamList, 'UserSearch'>
type Platform = 'village' | 'letterboxd'

type VillageSearchResult = {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

const AVATAR_SIZE = 36

// ---------------------------------------------------------------------------
// Village result row
// ---------------------------------------------------------------------------

function VillageResultRow({
  result,
  isFollowing,
  onFollow,
  onUnfollow,
}: {
  result: VillageSearchResult
  isFollowing: boolean
  onFollow: () => Promise<void>
  onUnfollow: () => Promise<void>
}) {
  const navigation = useNavigation<SearchNav>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [pending, setPending] = useState(false)
  const initial = (result.display_name || result.username || '?')[0].toUpperCase()

  const handleFollowPress = async () => {
    if (pending) return
    setPending(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isFollowing) {
      await onUnfollow()
    } else {
      await onFollow()
    }
    setPending(false)
  }

  return (
    <View style={styles.resultRow}>
      <Pressable
        style={({ pressed }) => [styles.resultRowContent, pressed && { opacity: 0.6 }]}
        onPress={() => navigation.navigate('NativeProfile', {
          userId: result.user_id,
          username: result.username ?? undefined,
        })}
      >
        {result.avatar_url ? (
          <Image source={result.avatar_url} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}

        <View style={styles.nameColumn}>
          <Text style={styles.resultDisplayName} numberOfLines={1}>
            {result.display_name || result.username}
          </Text>
          <View style={styles.handleRow}>
            <LogoIcon size={11} fill={colors.secondaryText} />
            <Text style={styles.handle}>@{result.username?.toUpperCase()}</Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={handleFollowPress}
        disabled={pending}
        hitSlop={8}
        style={({ pressed }) => pressed && { opacity: 0.6 }}
      >
        <Text style={isFollowing ? styles.followingText : styles.followText}>
          {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
        </Text>
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function UserSearchScreen() {
  const navigation = useNavigation<SearchNav>()
  const { user } = useUser()
  const { villageUserIds, addVillageUser, removeVillageUser } = useUserLists()
  const inputRef = useRef<TextInput>(null)
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [platform, setPlatform] = useState<Platform>('village')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Letterboxd-specific
  const [isValidating, setIsValidating] = useState(false)

  // Village-specific
  const [villageResults, setVillageResults] = useState<VillageSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // ---------------------------------------------------------------------------
  // Tab switching — clears all query state
  // ---------------------------------------------------------------------------

  const handlePlatformChange = (p: Platform) => {
    if (p === platform) return
    setPlatform(p)
    setQuery('')
    setError(null)
    setVillageResults([])
    setIsSearching(false)
    setIsValidating(false)
    // Re-focus after state flush
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ---------------------------------------------------------------------------
  // Village: debounced ilike search
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (platform !== 'village' || !query.trim()) {
      setVillageResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const baseQuery = supabase
          .from('user_data')
          .select('user_id, username, display_name, avatar_url')
          .ilike('username', `%${query.trim()}%`)
          .not('username', 'is', null)
          .limit(15)

        const { data } = user?.id
          ? await baseQuery.neq('user_id', user.id)
          : await baseQuery

        setVillageResults(data ?? [])
      } catch (err) {
        console.error('Village search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, platform, user?.id])

  // ---------------------------------------------------------------------------
  // Letterboxd: validate username → navigate
  // ---------------------------------------------------------------------------

  const handleLetterboxdSubmit = async () => {
    const username = query.trim().toLowerCase()
    if (!username) return

    setError(null)
    setIsValidating(true)

    try {
      const displayName = await fetchDisplayName(username)
      if (displayName === undefined) {
        setError('User not found')
        setIsValidating(false)
        return
      }
      navigation.replace('ExternalProfile', { username })
    } catch {
      setError('Connection error — try again')
      setIsValidating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Village follow / unfollow
  // ---------------------------------------------------------------------------

  const handleFollow = useCallback(async (result: VillageSearchResult) => {
    if (!result.username) return
    const villageUser: FollowedVillageUser = {
      user_id: result.user_id,
      username: result.username,
      display_name: result.display_name,
      avatar_url: result.avatar_url,
      added_at: new Date().toISOString(),
    }
    await addVillageUser(villageUser)
  }, [addVillageUser])

  const handleUnfollow = useCallback(async (userId: string) => {
    await removeVillageUser(userId)
  }, [removeVillageUser])

  const isVillage = platform === 'village'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Segmented control */}
      <View style={styles.segmentedTrack}>
        <Pressable
          onPress={() => handlePlatformChange('village')}
          style={[styles.segment, isVillage && styles.segmentActive]}
        >
          <LogoIcon size={26} fill={isVillage ? colors.foreground : colors.secondaryText} />
        </Pressable>
        <Pressable
          onPress={() => handlePlatformChange('letterboxd')}
          style={[styles.segment, !isVillage && styles.segmentActive]}
        >
          <View style={{ opacity: isVillage ? 0.4 : 1 }}>
            <LetterboxdDots size={28} />
          </View>
        </Pressable>
      </View>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={isVillage ? 'Search Village members…' : 'Letterboxd username'}
          placeholderTextColor={colors.secondaryText}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={isVillage ? undefined : handleLetterboxdSubmit}
          editable={!isValidating}
          returnKeyType={isVillage ? 'search' : 'go'}
        />

        {/* Unified action button — GO for Letterboxd, spinner/GO for Village */}
        <Pressable
          style={({ pressed }) => [
            styles.goButton,
            (isValidating || (isVillage && isSearching)) && styles.disabled,
            pressed && !isValidating && !isSearching && { opacity: 0.6 },
          ]}
          onPress={isVillage ? () => inputRef.current?.blur() : handleLetterboxdSubmit}
          disabled={isValidating || !query.trim()}
        >
          {isValidating || (isVillage && isSearching)
            ? <Spinner size={14} color={isVillage ? colors.secondaryText : colors.teal} />
            : <Text style={[styles.goText, isVillage && !query.trim() && styles.goTextMuted]}>GO</Text>
          }
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Village results / empty states */}
      {isVillage ? (
        query.trim() ? (
          <ScrollView
            style={styles.results}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {!isSearching && villageResults.length === 0 && (
              <Text style={styles.helperText}>No Village users found for "{query.trim()}"</Text>
            )}
            {villageResults.map((result) => (
              <VillageResultRow
                key={result.user_id}
                result={result}
                isFollowing={villageUserIds.includes(result.user_id)}
                onFollow={() => handleFollow(result)}
                onUnfollow={() => handleUnfollow(result.user_id)}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.helperText}>
            Search by username to find and follow Village members
          </Text>
        )
      ) : (
        !error && (
          <Text style={styles.helperText}>
            Search for any Letterboxd user by exact username
          </Text>
        )
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: spacing.xl,
    },
    // Segmented control (HIG pill)
    segmentedTrack: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 9,
      padding: 2,
      marginBottom: spacing.lg,
    },
    segment: {
      flex: 1,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 7,
    },
    segmentActive: {
      backgroundColor: colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 2,
      elevation: 2,
    },
    // Input
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      height: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: 0,
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      color: colors.foreground,
      backgroundColor: 'transparent',
    },
    goButton: {
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      minWidth: 36,
    },
    goText: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.teal,
    },
    goTextMuted: {
      color: colors.secondaryText,
    },
    disabled: {
      opacity: 0.5,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      textTransform: 'uppercase',
      color: colors.red,
      marginTop: spacing.xs,
    },
    helperText: {
      fontFamily: fonts.body,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
      marginTop: spacing.lg,
    },
    // Village results
    results: {
      flex: 1,
      marginTop: spacing.sm,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    resultRowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      marginRight: spacing.md,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.heading,
      fontSize: 14,
      color: colors.secondaryText,
    },
    nameColumn: {
      flex: 1,
      marginRight: spacing.md,
    },
    resultDisplayName: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
    },
    handleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    handle: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    followText: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.teal,
    },
    followingText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
  })
}
