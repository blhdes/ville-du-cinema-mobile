import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/contexts/ProfileContext'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/contexts/ThemeContext'
import LogoIcon from '@/components/ui/LogoIcon'
import ErrorBanner from '@/components/ui/ErrorBanner'
import Spinner from '@/components/ui/Spinner'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'

const AVATAR_SIZE = 96
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/
const USERNAME_MIN_LENGTH = 4

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'short'

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { colors } = useTheme()
  const typography = useTypography()
  const { updateProfile, uploadAvatar, setAvatarUrl, refetch } = useProfile()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  // Extract Google profile data (photo + name) from the OAuth identity
  const googleIdentity = user?.identities?.find((id) => id.provider === 'google')
  const googlePhotoUrl = (googleIdentity?.identity_data?.picture as string) ?? null
  const googleFullName = (googleIdentity?.identity_data?.full_name as string) ?? ''

  const [displayName, setDisplayName] = useState(googleFullName)
  const [username, setUsername] = useState('')
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')

  const usernameRef = useRef<TextInput>(null)

  // Entrance animation
  const contentOpacity = useSharedValue(0)
  const contentTranslateY = useSharedValue(12)

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    contentTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }))

  // Debounced username uniqueness check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase()

    if (!trimmed) {
      setUsernameStatus('idle')
      return
    }

    if (!USERNAME_REGEX.test(trimmed)) {
      setUsernameStatus('invalid')
      return
    }

    if (trimmed.length < USERNAME_MIN_LENGTH) {
      setUsernameStatus('short')
      return
    }

    setUsernameStatus('checking')
    let cancelled = false

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('user_data')
        .select('user_id')
        .eq('username', trimmed)
        .neq('user_id', user?.id ?? '')
        .maybeSingle()

      if (!cancelled) setUsernameStatus(data ? 'taken' : 'available')
    }, 400)

    return () => { clearTimeout(timer); cancelled = true }
  }, [username, user?.id])

  const emailInitial = (user?.email ?? '?')[0].toUpperCase()

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })
    if (result.canceled) return
    setSelectedImageUri(result.assets[0].uri)
  }, [])

  const trimmedUsername = username.trim()
  const trimmedDisplayName = displayName.trim()

  const isContinueDisabled = isSaving
    || !trimmedDisplayName
    || trimmedUsername.length < USERNAME_MIN_LENGTH
    || usernameStatus === 'taken'
    || usernameStatus === 'invalid'
    || usernameStatus === 'checking'

  const handleContinue = useCallback(async () => {
    if (isContinueDisabled) return
    setIsSaving(true)
    setError(null)

    try {
      // Local pick → upload to Supabase Storage; Google photo → save URL directly
      if (selectedImageUri) {
        await uploadAvatar(selectedImageUri)
      } else if (googlePhotoUrl) {
        await setAvatarUrl(googlePhotoUrl)
      }

      await updateProfile({
        display_name: displayName.trim() || undefined,
        username: username.trim().toLowerCase(),
      })

      await refetch()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      console.error('ProfileSetupScreen save error:', err)
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }, [isContinueDisabled, selectedImageUri, googlePhotoUrl, displayName, username, uploadAvatar, setAvatarUrl, updateProfile, refetch])

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {error ? <ErrorBanner message={error} /> : null}

        {/* Header */}
        <View style={styles.header}>
          <LogoIcon size={48} fill={colors.foreground} />
          <Text style={styles.title}>Welcome to the Village</Text>
          <View style={styles.rule} />
          <Text style={styles.subtitle}>
            Choose a unique handle so others can find you.
          </Text>
        </View>

        <Animated.View style={contentStyle}>
          {/* Avatar */}
          <View style={[styles.avatarSection, isSaving && styles.disabled]}>
            <Pressable onPress={handlePickImage} disabled={isSaving}>
              {selectedImageUri || googlePhotoUrl ? (
                <Image source={{ uri: selectedImageUri ?? googlePhotoUrl! }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{emailInitial}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={handlePickImage} disabled={isSaving} hitSlop={8}>
              <Text style={styles.photoText}>
                {selectedImageUri || googlePhotoUrl ? 'Change photo' : 'Choose a photo'}
              </Text>
            </Pressable>
          </View>

          {/* Username — required */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.handleRow}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                ref={usernameRef}
                style={[styles.input, styles.handleInput]}
                value={username}
                onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="your_handle"
                placeholderTextColor={colors.secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                maxLength={20}
                editable={!isSaving}
              />
            </View>
            {usernameStatus !== 'idle' && (
              <Text style={[
                styles.hint,
                usernameStatus === 'available' && { color: colors.teal },
                (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'short') && { color: colors.red },
              ]}>
                {usernameStatus === 'checking' && 'Checking...'}
                {usernameStatus === 'available' && 'Available'}
                {usernameStatus === 'taken' && 'Already taken'}
                {usernameStatus === 'invalid' && 'Letters, numbers and _ only'}
                {usernameStatus === 'short' && `At least ${USERNAME_MIN_LENGTH} characters`}
              </Text>
            )}
          </View>

          {/* Display name — required */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={50}
              editable={!isSaving}
              onSubmitEditing={handleContinue}
            />
          </View>

          {/* Continue */}
          <Pressable
            style={[styles.button, isContinueDisabled && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isContinueDisabled}
          >
            {isSaving ? (
              <Spinner size={18} />
            ) : (
              <Text style={[styles.buttonText, isContinueDisabled && styles.buttonTextDisabled]}>
                Continue
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 32,
    },
    disabled: {
      opacity: 0.5,
    },

    // Header
    header: {
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: typography.magazineTitle.fontSize,
      lineHeight: typography.magazineTitle.lineHeight,
      color: colors.foreground,
      textAlign: 'center',
    },
    rule: {
      width: 60,
      height: 1,
      backgroundColor: colors.foreground,
    },
    subtitle: {
      fontFamily: fonts.bodyItalic,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.secondaryText,
      textAlign: 'center',
    },

    // Avatar
    avatarSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontFamily: fonts.heading,
      fontSize: 36,
      color: colors.secondaryText,
    },
    photoText: {
      fontFamily: fonts.system,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
      marginTop: spacing.sm,
    },

    // Fields
    fieldGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      fontFamily: fonts.system,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginBottom: spacing.sm,
    },
    handleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    atSign: {
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      color: colors.secondaryText,
      marginRight: spacing.xs,
    },
    handleInput: {
      flex: 1,
      borderBottomWidth: 0,
    },
    input: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: spacing.sm,
      fontFamily: fonts.system,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
      backgroundColor: 'transparent',
    },
    hint: {
      fontFamily: fonts.system,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      marginTop: spacing.xs,
    },

    // Button
    button: {
      marginTop: spacing.lg,
      backgroundColor: colors.foreground,
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.3,
    },
    buttonText: {
      fontFamily: fonts.system,
      fontWeight: '600' as const,
      fontSize: typography.body.fontSize,
      color: colors.background,
    },
    buttonTextDisabled: {
      color: colors.background,
    },
  })
}
