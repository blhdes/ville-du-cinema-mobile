import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { DISCOVERY_USERS } from '@/constants/discoveryUsers'
import { colors, fonts, spacing, typography } from '@/theme'
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            pressed && styles.addButtonPressed,
          ]}
          onPress={handleAdd}
          disabled={isAdding}
        >
          <Text style={styles.addButtonText}>Add</Text>
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
              <Text style={styles.username}>{u.username}</Text>
              <Pressable
                onPress={() => onRemove(u.username)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>Remove</Text>
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
                  pressed && styles.suggestionPressed,
                ]}
                onPress={() => onAdd(username)}
              >
                <Text style={styles.suggestionText}>{username}</Text>
                <Text style={styles.suggestionAction}>Add</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
    backgroundColor: colors.backgroundSecondary,
  },
  addButton: {
    height: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.blue,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.body.fontSize,
    color: colors.white,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  modeText: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  userList: {
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontFamily: fonts.body,
    fontSize: typography.caption.fontSize,
    color: colors.accent,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  discovery: {
    marginTop: spacing.lg,
  },
  suggestionList: {
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionPressed: {
    backgroundColor: colors.border,
  },
  suggestionText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  suggestionAction: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.blue,
  },
})
