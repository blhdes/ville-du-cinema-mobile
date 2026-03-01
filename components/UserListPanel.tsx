import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native'
import { DISCOVERY_USERS } from '@/constants/discoveryUsers'
import { colors, fonts, spacing, common } from '@/theme'
import SectionHeader from '@/components/ui/SectionHeader'
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
  const [expanded, setExpanded] = useState(false)
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
    <View>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <SectionHeader
          title={`FOLLOWING (${users.length})  ${expanded ? '▲' : '▼'}`}
          color="yellow"
        />
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {/* Add input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Letterboxd username"
              placeholderTextColor={colors.sepiaLight}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleAdd}
              editable={!isAdding}
            />
            <Pressable
              style={[styles.addButton, isAdding && styles.disabled]}
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

          {/* Current users */}
          {users.length > 0 ? (
            <ScrollView style={styles.userList} nestedScrollEnabled>
              {users.map((u) => (
                <View key={u.username} style={styles.userRow}>
                  <Text style={styles.username}>{u.username}</Text>
                  <Pressable onPress={() => onRemove(u.username)} hitSlop={8}>
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>
              Add Letterboxd users to see their activity
            </Text>
          )}

          {/* Discovery suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.discovery}>
              <Text style={styles.discoveryTitle}>DISCOVER</Text>
              {suggestions.map((username) => (
                <Pressable
                  key={username}
                  style={styles.suggestionRow}
                  onPress={() => onAdd(username)}
                >
                  <Text style={styles.suggestionText}>+ {username}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 2,
    borderColor: colors.black,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.black,
    backgroundColor: colors.cream,
  },
  addButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.yellow,
    letterSpacing: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.red,
    marginTop: spacing.xs,
  },
  modeText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.sepia,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  userList: {
    maxHeight: 200,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.sepiaLight,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.black,
  },
  removeText: {
    fontSize: 14,
    color: colors.sepia,
  },
  emptyText: {
    fontFamily: fonts.bodyItalic,
    fontSize: 14,
    color: colors.sepia,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  discovery: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.sepiaLight,
  },
  discoveryTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.sepia,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  suggestionRow: {
    paddingVertical: spacing.xs,
  },
  suggestionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.blue,
  },
})
