import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { fetchDisplayName } from '@/services/feed'
import type { FeedStackParamList } from '@/navigation/types'
import { colors, fonts, spacing, typography } from '@/theme'
import Spinner from '@/components/ui/Spinner'

type SearchNav = NativeStackNavigationProp<FeedStackParamList, 'UserSearch'>

export default function UserSearchScreen() {
  const navigation = useNavigation<SearchNav>()
  const inputRef = useRef<TextInput>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleSubmit = async () => {
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

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Letterboxd username"
          placeholderTextColor={colors.secondaryText}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={handleSubmit}
          editable={!isValidating}
          returnKeyType="go"
        />
        <Pressable
          style={({ pressed }) => [
            styles.goButton,
            isValidating && styles.disabled,
            pressed && !isValidating && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={isValidating || !query.trim()}
        >
          {isValidating ? (
            <Spinner size={14} color={colors.teal} />
          ) : (
            <Text style={styles.goText}>GO</Text>
          )}
        </Pressable>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Text style={styles.helperText}>
        Search for any Letterboxd user by username
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: spacing.xl,
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
})
