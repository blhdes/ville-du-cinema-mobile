import { useMemo, useState } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DISCOVERY_USERS } from '@/constants/discoveryUsers'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import type { FeedStackParamList } from '@/navigation/types'
import type { FollowedUser } from '@/types/database'

interface UserListPanelProps {
  users: FollowedUser[]
  isAuthenticated: boolean
  onAdd: (username: string) => Promise<{ success: boolean; error?: string }>
  onRemove: (username: string) => Promise<void>
}

export default function UserListPanel({
  users,
  isAuthenticated,
  onAdd,
  onRemove,
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

  // Pick 3 random discovery suggestions not already in list
  const suggestions = DISCOVERY_USERS
    .filter((u) => !users.some((fu) => fu.username === u))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
      {/* Add input */}
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

      {addError && (
        <Text style={styles.errorText}>{addError}</Text>
      )}

      {/* Mode indicator */}
      <Text style={styles.modeText}>
        {isAuthenticated ? 'Synced with your account' : 'Guest mode — saved locally'}
      </Text>

      {/* Following section */}
      <Text style={styles.sectionLabel}>
        Following ({users.length})
      </Text>

      {users.length > 0 ? (
        <View style={styles.userList}>
          {users.map((u) => (
            <View key={u.username} style={styles.userRow}>
              <Pressable
                onPress={() => navigation.navigate('ExternalProfile', { username: u.username })}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Text style={styles.username}>@{u.username}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onRemove(u.username)
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.removeText}>REMOVE</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Add Letterboxd users to see their activity in your feed.
        </Text>
      )}

      {/* Discovery suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.discovery}>
          <Text style={styles.sectionLabel}>Discover</Text>
          <View style={styles.suggestionList}>
            {suggestions.map((username) => (
              <Pressable
                key={username}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && { opacity: 0.6 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  onAdd(username)
                }}
              >
                <Text style={styles.suggestionText}>{username}</Text>
                <Text style={styles.suggestionAction}>ADD</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
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
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      color: colors.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    userList: {
      overflow: 'hidden',
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
      fontFamily: fonts.body,
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
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    discovery: {
      marginTop: spacing.lg,
    },
    suggestionList: {
      overflow: 'hidden',
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
