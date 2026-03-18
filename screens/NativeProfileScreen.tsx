import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase/client'
import { getUserClippings } from '@/services/clippings'
import { useUserLists } from '@/hooks/useUserLists'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import type { FeedStackParamList } from '@/navigation/types'
import type { Clipping, FollowedVillageUser, VillagePublicProfile } from '@/types/database'
import ProfileSkeleton from '@/components/profile/ProfileSkeleton'
import ClippingCard from '@/components/profile/ClippingCard'

const AVATAR_SIZE = 72
const HORIZONTAL_PAD = 20

// No-op with correct signature — onDeleted is required by ClippingCard
const NOOP = (_id: string) => {}

export default function NativeProfileScreen() {
  const route = useRoute<RouteProp<FeedStackParamList, 'NativeProfile'>>()
  const { userId } = route.params
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { villageUserIds, addVillageUser, removeVillageUser } = useUserLists()

  const isFollowing = villageUserIds.includes(userId)

  const [profile, setProfile] = useState<VillagePublicProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [clippingsLoading, setClippingsLoading] = useState(true)

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(async () => {
      const [profileResult, clippingsResult] = await Promise.allSettled([
        supabase
          .from('user_data')
          .select('user_id, username, display_name, avatar_url, bio')
          .eq('user_id', userId)
          .single(),
        getUserClippings(userId),
      ])

      if (profileResult.status === 'fulfilled') {
        const { data, error } = profileResult.value
        if (data && !error) setProfile(data as VillagePublicProfile)
      }
      setProfileLoading(false)

      if (clippingsResult.status === 'fulfilled') {
        setClippings(clippingsResult.value)
      }
      setClippingsLoading(false)
    })

    return () => task.cancel()
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
  // List header — rendered only once profile is loaded
  // ---------------------------------------------------------------------------

  const listHeader = profile ? (
    <>
      <View style={styles.profileHeader}>
        {profile.avatar_url ? (
          <Image source={profile.avatar_url} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(profile.display_name || profile.username || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}

        {profile.display_name ? (
          <Text style={styles.displayName}>{profile.display_name}</Text>
        ) : null}

        {profile.username ? (
          <Text style={styles.handle}>@{profile.username.toUpperCase()}</Text>
        ) : null}

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        {/* Metadata row — mirrors the 2-bone skeleton placeholder */}
        <View style={styles.metaRow}>
          <Text style={styles.metaCount}>
            {clippingsLoading ? '—' : `${clippings.length} CLIPPINGS`}
          </Text>
          <Pressable
            onPress={handleFollowToggle}
            hitSlop={8}
            style={({ pressed }) => [styles.followButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={isFollowing ? styles.followingText : styles.followText}>
              {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>CLIPPINGS</Text>

      {clippingsLoading && (
        <ActivityIndicator color={colors.secondaryText} style={styles.clippingsLoading} />
      )}

      {!clippingsLoading && clippings.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={32} color={colors.border} />
          <Text style={styles.emptyText}>No clippings saved yet.</Text>
        </View>
      )}
    </>
  ) : null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {profileLoading ? (
        <ProfileSkeleton variant="external" />
      ) : (
        <FlatList
          data={clippingsLoading ? [] : clippings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClippingCard
              clipping={item}
              onDeleted={NOOP}
              readOnly
              user={profile ? {
                avatarUrl: profile.avatar_url ?? undefined,
                displayName: profile.display_name ?? profile.username ?? 'Village User',
              } : undefined}
            />
          )}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: tabBarHeight + insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        />
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
    },

    // Centered profile header — mirrors ExternalHeaderBones spatially
    profileHeader: {
      alignItems: 'center',
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.xl,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.heading,
      fontSize: 28,
      color: colors.secondaryText,
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
      fontFamily: fonts.body,
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
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
    },
    followButton: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
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

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: HORIZONTAL_PAD,
    },
    sectionLabel: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      paddingHorizontal: HORIZONTAL_PAD,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    clippingsLoading: {
      paddingVertical: spacing.xxl,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: HORIZONTAL_PAD,
      gap: spacing.md,
    },
    emptyText: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
    },
  })
}
