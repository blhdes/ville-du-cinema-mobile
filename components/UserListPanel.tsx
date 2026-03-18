import { useCallback, useMemo, useState } from 'react'
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DISCOVERY_USERS } from '@/constants/discoveryUsers'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import type { FeedStackParamList } from '@/navigation/types'
import type { FollowedUser, FollowedVillageUser } from '@/types/database'
import { useAvatarUrl } from '@/services/avatarCache'
import LetterboxdDots from '@/components/ui/LetterboxdDots'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrawerItem =
  | { kind: 'village'; user: FollowedVillageUser }
  | { kind: 'letterboxd'; user: FollowedUser }
  | { kind: 'empty'; label: string }

type DrawerSection = {
  platform: 'village' | 'letterboxd'
  data: DrawerItem[]
}

interface UserListPanelProps {
  users: FollowedUser[]
  villageUsers: FollowedVillageUser[]
  isAuthenticated: boolean
  onAdd: (username: string) => Promise<{ success: boolean; error?: string }>
  onRemove: (username: string) => Promise<void>
  onRemoveVillageUser: (userId: string) => Promise<void>
}

const AVATAR_SIZE = 26

// ---------------------------------------------------------------------------
// Row sub-components (hooks require components, not callbacks)
// ---------------------------------------------------------------------------

function VillageUserRow({
  user,
  onUnfollow,
}: {
  user: FollowedVillageUser
  onUnfollow: () => void
}) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const initial = (user.display_name || user.username || '?')[0].toUpperCase()
  const name = user.display_name || user.username || 'Village User'

  return (
    <View style={styles.userRow}>
      <View style={styles.userInfo}>
        {user.avatar_url ? (
          <Image source={user.avatar_url} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={[styles.avatarInitial, { color: colors.secondaryText }]}>{initial}</Text>
          </View>
        )}
        <Text style={styles.username} numberOfLines={1}>
          {name}
          {user.username ? (
            <Text style={styles.handle}>{' '}@{user.username}</Text>
          ) : null}
        </Text>
      </View>
      <Pressable
        onPress={onUnfollow}
        hitSlop={8}
        style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.removeText}>Unfollow</Text>
      </Pressable>
    </View>
  )
}

function LetterboxdUserRow({
  user,
  onUnfollow,
  onPress,
}: {
  user: FollowedUser
  onUnfollow: () => void
  onPress: () => void
}) {
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])
  const avatarUrl = useAvatarUrl(user.username)
  const initial = (user.display_name || user.username || '?')[0].toUpperCase()

  return (
    <View style={styles.userRow}>
      <Pressable
        style={({ pressed }) => [styles.userInfo, pressed && { opacity: 0.6 }]}
        onPress={onPress}
      >
        {avatarUrl ? (
          <Image source={avatarUrl} style={styles.avatar} cachePolicy="memory-disk" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={[styles.avatarInitial, { color: colors.secondaryText }]}>{initial}</Text>
          </View>
        )}
        <Text style={styles.username} numberOfLines={1}>
          {user.display_name || user.username}
          <Text style={styles.handle}>{' '}@{user.username}</Text>
        </Text>
      </Pressable>
      <Pressable
        onPress={onUnfollow}
        hitSlop={8}
        style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.removeText}>Unfollow</Text>
      </Pressable>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserListPanel({
  users,
  villageUsers,
  isAuthenticated,
  onAdd,
  onRemove,
  onRemoveVillageUser,
}: UserListPanelProps) {
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>()
  const insets = useSafeAreaInsets()
  const bottomPadding = insets.bottom + 49 + 20
  const { colors } = useTheme()
  const typography = useTypography()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const [input, setInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!input.trim()) return
    setIsAdding(true)
    setAddError(null)
    const result = await onAdd(input.trim())
    if (!result.success) {
      setAddError(result.error || 'Failed to add user')
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setInput('')
    }
    setIsAdding(false)
  }

  // 3 random discovery suggestions not already in list
  const suggestions = DISCOVERY_USERS
    .filter((u) => !users.some((fu) => fu.username === u))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  // ---------------------------------------------------------------------------
  // SectionList data
  // ---------------------------------------------------------------------------

  const sections: DrawerSection[] = useMemo(() => [
    {
      platform: 'village',
      data: villageUsers.length > 0
        ? villageUsers.map((u): DrawerItem => ({ kind: 'village', user: u }))
        : [{ kind: 'empty', label: 'Follow Village members from their profile pages.' }],
    },
    {
      platform: 'letterboxd',
      data: users.length > 0
        ? users.map((u): DrawerItem => ({ kind: 'letterboxd', user: u }))
        : [{ kind: 'empty', label: 'Add a Letterboxd username above.' }],
    },
  ], [villageUsers, users])

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderSectionHeader = useCallback(({ section }: { section: DrawerSection }) => {
    if (section.platform === 'village') return null
    return (
      <View style={styles.sectionHeader}>
        <LetterboxdDots size={22} />
        <Text style={styles.sectionLabel}>Letterboxd</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{users.length}</Text>
        </View>
      </View>
    )
  }, [users.length, styles])

  const renderItem = useCallback(({ item }: { item: DrawerItem }) => {
    if (item.kind === 'empty') {
      return <Text style={styles.emptyText}>{item.label}</Text>
    }

    if (item.kind === 'village') {
      return (
        <VillageUserRow
          user={item.user}
          onUnfollow={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onRemoveVillageUser(item.user.user_id)
          }}
        />
      )
    }

    return (
      <LetterboxdUserRow
        user={item.user}
        onPress={() => navigation.navigate('ExternalProfile', { username: item.user.username })}
        onUnfollow={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onRemove(item.user.username)
        }}
      />
    )
  }, [styles, navigation, onRemove, onRemoveVillageUser])

  // ---------------------------------------------------------------------------
  // Header / Footer
  // ---------------------------------------------------------------------------

  const listHeader = (
    <>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add Letterboxd username"
          placeholderTextColor={colors.secondaryText}
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAdd}
          editable={!isAdding}
          returnKeyType="done"
        />
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            isAdding && styles.disabled,
            pressed && { opacity: 0.6 },
          ]}
          onPress={handleAdd}
          disabled={isAdding}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {addError && <Text style={styles.errorText}>{addError}</Text>}

      <Text style={styles.modeText}>
        {isAuthenticated ? 'Synced with your account' : 'Guest mode — saved locally'}
      </Text>
    </>
  )

  const listFooter = suggestions.length > 0 ? (
    <View style={styles.discovery}>
      <Text style={styles.discoverLabel}>Discover Critics</Text>
      <View>
        {suggestions.map((username) => (
          <Pressable
            key={username}
            style={({ pressed }) => [styles.suggestionRow, pressed && { opacity: 0.6 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onAdd(username)
            }}
          >
            <Text style={styles.suggestionText}>@{username}</Text>
            <Text style={styles.suggestionAction}>Add</Text>
          </Pressable>
        ))}
      </View>
    </View>
  ) : null

  return (
    <SectionList<DrawerItem, DrawerSection>
      sections={sections}
      keyExtractor={(item, index) => {
        if (item.kind === 'village') return `village-${item.user.user_id}`
        if (item.kind === 'letterboxd') return `letterboxd-${item.user.username}`
        return `empty-${index}`
      }}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={9}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      stickySectionHeadersEnabled={false}
    />
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: spacing.lg,
    },
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
    addButton: {
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
    },
    addButtonText: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.teal,
    },
    disabled: {
      opacity: 0.5,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.red,
      marginTop: spacing.xs,
    },
    modeText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      color: colors.secondaryText,
      letterSpacing: typography.magazineMeta.letterSpacing,
    },
    countPill: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginLeft: 2,
    },
    countPillText: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
    },
    userRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    userInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginRight: spacing.sm,
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
      fontSize: 13,
    },
    username: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
      flex: 1,
    },
    handle: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      color: colors.foreground,
      opacity: 0.8,
    },
    removeButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    removeText: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.red,
    },
    emptyText: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      paddingVertical: spacing.md,
    },
    discovery: {
      marginTop: spacing.xl,
    },
    discoverLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      color: colors.secondaryText,
      letterSpacing: typography.magazineMeta.letterSpacing,
      marginBottom: spacing.sm,
    },
    suggestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
    },
    suggestionAction: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.teal,
    },
  })
}
