import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase/client'
import { getUserClippings } from '@/services/clippings'
import { getUserTakes } from '@/services/takes'
import { getUserSavedFilms } from '@/services/savedFilms'
import { getUserFavorites } from '@/services/favoriteFilms'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { FeedStackParamList } from '@/navigation/types'
import type { Clipping, Take, SavedFilm, FavoriteFilm, FollowedVillageUser, VillagePublicProfile } from '@/types/database'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import ClippingCard from '@/components/profile/ClippingCard'
import RepostCard from '@/components/feed/RepostCard'
import TakeCard from '@/components/TakeCard'
import ExpandableAvatar from '@/components/ui/ExpandableAvatar'
import FollowButton from '@/components/ui/FollowButton'
import FavoriteFilmsGrid from '@/components/profile/FavoriteFilmsGrid'

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

// No-op with correct signature — onDeleted is required by ClippingCard
const NOOP = (_id: string) => {}

export default function NativeProfileScreen() {
  const route = useRoute<RouteProp<FeedStackParamList, 'NativeProfile'>>()
  const { userId } = route.params
  const tabBarInset = useTabBarInset()
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const { villageUserIds, addVillageUser, removeVillageUser } = useUserLists()

  const isFollowing = villageUserIds.includes(userId)

  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()

  const [profile, setProfile] = useState<VillagePublicProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [takes, setTakes] = useState<Take[]>([])
  const [savedFilms, setSavedFilms] = useState<SavedFilm[]>([])
  const [favorites, setFavorites] = useState<FavoriteFilm[]>([])
  const [contentLoading, setContentLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const task = InteractionManager.runAfterInteractions(async () => {
      const [profileResult, clippingsResult, takesResult, savedResult, favResult] = await Promise.allSettled([
        supabase
          .from('user_data')
          .select('user_id, username, display_name, avatar_url, bio, location, website_url, website_label, twitter_handle, letterboxd_username')
          .eq('user_id', userId)
          .single(),
        getUserClippings(userId),
        getUserTakes(userId),
        getUserSavedFilms(userId),
        getUserFavorites(userId),
      ])

      if (profileResult.status === 'fulfilled') {
        const { data, error } = profileResult.value
        if (data && !error && !cancelled) setProfile(data as VillagePublicProfile)
      }
      if (!cancelled) setProfileLoading(false)

      if (clippingsResult.status === 'fulfilled' && !cancelled) {
        setClippings(clippingsResult.value)
      }
      if (takesResult.status === 'fulfilled' && !cancelled) {
        setTakes(takesResult.value)
      }
      if (savedResult.status === 'fulfilled' && !cancelled) {
        setSavedFilms(savedResult.value)
      }
      if (favResult.status === 'fulfilled' && !cancelled) {
        setFavorites(favResult.value)
      }
      if (!cancelled) setContentLoading(false)
    })

    return () => { cancelled = true; task.cancel() }
  }, [userId])

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isFollowing) {
      await removeVillageUser(userId)
    } else {
      const villageUser: FollowedVillageUser = {
        user_id: userId,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        added_at: new Date().toISOString(),
      }
      await addVillageUser(villageUser)
    }
  }, [profile, isFollowing, userId, addVillageUser, removeVillageUser])

  // ---------------------------------------------------------------------------
  // List header + renderItem — memoized to prevent unnecessary FlatList remounts
  // ---------------------------------------------------------------------------

  const clippingUser = useMemo(() => profile ? {
    avatarUrl: profile.avatar_url ?? undefined,
    displayName: profile.display_name ?? profile.username ?? 'Village User',
  } : undefined, [profile])

  const listHeader = useMemo(() => {
    if (!profile) return null
    return (
      <>
        <View style={styles.profileHeader}>
          <ExpandableAvatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            username={profile.username}
            size={AVATAR_SIZE}
          />

          {profile.display_name ? (
            <Text style={styles.displayName}>{profile.display_name}</Text>
          ) : null}

          {profile.username ? (
            <Text style={styles.handle}>@{profile.username}</Text>
          ) : null}

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Metadata row — mirrors the 2-bone skeleton placeholder */}
          <View style={styles.metaRow}>
            <Text style={styles.metaCount}>
              {contentLoading ? '—' : `${takes.length} takes · ${clippings.length} clippings`}
            </Text>
            <FollowButton isFollowing={isFollowing} onPress={handleFollowToggle} />
          </View>
        </View>

        {/* Favorite Films grid (read-only) */}
        {favorites.length > 0 && (
          <FavoriteFilmsGrid favorites={favorites} />
        )}

        {/* Watchlist link */}
        {savedFilms.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.watchlistLink, pressed && styles.pressed]}
            onPress={() => navigation.navigate('SavedFilms', {
              userId,
              username: profile.username ?? undefined,
            })}
          >
            <Ionicons name="bookmark-outline" size={16} color={colors.teal} />
            <Text style={styles.watchlistLinkText}>
              Watchlist ({savedFilms.length})
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </Pressable>
        )}

        {/* Takes section */}
        {takes.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Takes</Text>
            {takes.map((take) => (
              <TakeCard key={take.id} take={take} hideAuthor readOnly />
            ))}
            <View style={styles.divider} />
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Clippings</Text>

        {clippings.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={32} color={colors.border} />
            <Text style={styles.emptyText}>No clippings saved yet.</Text>
          </View>
        )}
      </>
    )
  }, [profile, contentLoading, clippings, takes, savedFilms, favorites, isFollowing, handleFollowToggle, navigation, styles, colors, userId])

  const renderItem = useCallback(({ item }: { item: Clipping }) => {
    if (item.type === 'repost' && item.review_json) {
      return (
        <RepostCard
          clipping={item}
          owner={{
            avatarUrl: clippingUser?.avatarUrl,
            displayName: clippingUser?.displayName ?? 'Village User',
            userId,
          }}
        />
      )
    }
    return (
      <ClippingCard
        clipping={item}
        onDeleted={NOOP}
        readOnly
        user={clippingUser}
      />
    )
  }, [clippingUser, userId])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {profileLoading || contentLoading ? (
        <ProfileSkeleton variant="native" />
      ) : (
        <FlatList
          data={clippings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={9}
          contentContainerStyle={{ paddingBottom: tabBarInset + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Centered profile header — mirrors ExternalHeaderBones spatially
    profileHeader: {
      alignItems: 'center',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.xl,
    },
    displayName: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    handle: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    bio: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    // Mirrors the 2-bone metadataRow in ExternalHeaderBones
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    metaCount: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: HORIZONTAL_PAD,
    },
    sectionLabel: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: HORIZONTAL_PAD,
      gap: spacing.md,
    },
    emptyText: {
      fontFamily: fonts.system,
      fontStyle: 'italic' as const,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.6,
    },
    watchlistLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingVertical: spacing.md,
    },
    watchlistLinkText: {
      flex: 1,
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
    },
  })
}
