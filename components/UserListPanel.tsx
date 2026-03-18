import { useMemo, useState } from 'react'
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DISCOVERY_USERS } from '@/constants/discoveryUsers'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import type { FeedStackParamList } from '@/navigation/types'
import type { FollowedUser, FollowedVillageUser } from '@/types/database'
import LetterboxdDots from '@/components/ui/LetterboxdDots'
import LogoIcon from '@/components/ui/LogoIcon'

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
  const styles = useMemo(() => createStyles(colors), [colors])

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

  const renderSectionHeader = ({ section }: { section: DrawerSection }) => {
    const isVillage = section.platform === 'village'
    const count = isVillage ? villageUsers.length : users.length
    return (
      <View style={styles.sectionHeader}>
        {isVillage
          ? <LogoIcon size={32} fill={colors.secondaryText} />
          : <LetterboxdDots size={22} />
        }
        <Text style={styles.sectionLabel}>
          {isVillage ? 'VILLAGE' : 'LETTERBOXD'} ({count})
        </Text>
      </View>
    )
  }

  const renderItem = ({ item }: { item: DrawerItem }) => {
    if (item.kind === 'empty') {
      return <Text style={styles.emptyText}>{item.label}</Text>
    }

    if (item.kind === 'village') {
      const { user } = item
      return (
        <View style={styles.userRow}>
          <Text style={styles.username}>
            {user.display_name || user.username || 'Village User'}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onRemoveVillageUser(user.user_id)
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.removeText}>UNFOLLOW</Text>
          </Pressable>
        </View>
      )
    }

    // kind === 'letterboxd'
    const { user } = item
    return (
      <View style={styles.userRow}>
        <Pressable
          onPress={() => navigation.navigate('ExternalProfile', { username: user.username })}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.username}>@{user.username}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onRemove(user.username)
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.removeText}>UNFOLLOW</Text>
        </Pressable>
      </View>
    )
  }

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
          <Text style={styles.addButtonText}>ADD</Text>
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
      <Text style={styles.discoverLabel}>Discover Letterboxd</Text>
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
            <Text style={styles.suggestionAction}>ADD</Text>
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
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      stickySectionHeadersEnabled={false}
    />
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors) {
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
      textTransform: 'uppercase',
      color: colors.red,
      marginTop: spacing.xs,
    },
    modeText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      textTransform: 'uppercase',
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
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    userRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    username: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
    },
    removeButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    removeText: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      textTransform: 'uppercase',
      color: colors.red,
    },
    emptyText: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      paddingVertical: spacing.md,
      paddingHorizontal: 20,
    },
    discovery: {
      marginTop: spacing.xl,
    },
    discoverLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: spacing.sm,
    },
    suggestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 20,
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
      textTransform: 'uppercase',
      color: colors.teal,
    },
  })
}
