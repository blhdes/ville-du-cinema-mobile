import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase/client'
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, type ThemeColors } from '@/theme'
import { useTypography, type ScaledTypography } from '@/hooks/useTypography'
import ErrorBanner from '@/components/ui/ErrorBanner'
import Spinner from '@/components/ui/Spinner'

const AVATAR_SIZE = 96
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const typography = useTypography()
  const { profile, updateProfile, uploadAvatar, refetch } = useProfile()
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography])

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')

  // Fill fields once profile arrives if it wasn't ready at mount
  const initialized = useRef(!!profile)
  useEffect(() => {
    if (profile && !initialized.current) {
      setDisplayName(profile.display_name ?? '')
      setUsername(profile.username ?? '')
      setBio(profile.bio ?? '')
      initialized.current = true
    }
  }, [profile])

  // Debounced username uniqueness check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase()

    // Unchanged from saved value — skip
    if (trimmed === (profile?.username ?? '')) {
      setUsernameStatus('idle')
      return
    }

    // Cleared — allow
    if (!trimmed) {
      setUsernameStatus('idle')
      return
    }

    // Invalid characters — instant feedback, no network call
    if (!USERNAME_REGEX.test(trimmed)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    let cancelled = false

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('user_data')
        .select('user_id')
        .eq('username', trimmed)
        .neq('user_id', profile?.user_id ?? '')
        .maybeSingle()

      if (!cancelled) setUsernameStatus(data ? 'taken' : 'available')
    }, 400)

    return () => { clearTimeout(timer); cancelled = true }
  }, [username, profile?.username, profile?.user_id])

  const avatarUri = selectedImageUri ?? profile?.avatar_url ?? null

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

  const isSaveDisabled = isSaving
    || usernameStatus === 'taken'
    || usernameStatus === 'invalid'
    || usernameStatus === 'checking'

  const handleSave = useCallback(async () => {
    if (isSaveDisabled) return
    setIsSaving(true)
    setError(null)

    try {
      if (selectedImageUri) await uploadAvatar(selectedImageUri)

      await updateProfile({
        display_name: displayName.trim() || undefined,
        username: username.trim().toLowerCase() || null,
        bio: bio.trim(),
      })

      await refetch()
      navigation.goBack()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      console.error('EditProfileScreen save error:', err)
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }, [isSaveDisabled, selectedImageUri, displayName, username, bio, uploadAvatar, updateProfile, refetch, navigation])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} disabled={isSaving} hitSlop={8}>
          <Ionicons name="close" size={32} style={isSaving ? { opacity: 0.3 } : undefined} />
        </Pressable>
      ),
      headerRight: () =>
        isSaving ? (
          <Spinner size={16} />
        ) : (
          <Pressable onPress={handleSave} hitSlop={8} disabled={isSaveDisabled}>
            <Ionicons
              name="checkmark"
              size={32}
              style={isSaveDisabled ? { opacity: 0.3 } : undefined}
            />
          </Pressable>
        ),
    })
  }, [navigation, isSaving, isSaveDisabled, handleSave])

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {error ? <ErrorBanner message={error} /> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={[styles.avatarSection, isSaving && styles.disabledSection]}>
            <Pressable onPress={handlePickImage} disabled={isSaving}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={handlePickImage} disabled={isSaving} hitSlop={8}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </Pressable>
          </View>

          {/* Display Name — free text, spaces allowed */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={50}
              editable={!isSaving}
            />
          </View>

          {/* Username — letters, numbers, _ only, must be unique */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
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
            {usernameStatus !== 'idle' && (
              <Text style={[
                styles.usernameHint,
                usernameStatus === 'available' && { color: colors.teal },
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && { color: colors.red },
              ]}>
                {usernameStatus === 'checking' && 'Checking…'}
                {usernameStatus === 'available' && 'Available'}
                {usernameStatus === 'taken' && 'Already taken'}
                {usernameStatus === 'invalid' && 'Letters, numbers and _ only'}
              </Text>
            )}
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="A few words about you"
              placeholderTextColor={colors.secondaryText}
              multiline
              textAlignVertical="top"
              maxLength={160}
              editable={!isSaving}
            />
            <Text style={styles.charCount}>{bio.length}/160</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function createStyles(colors: ThemeColors, typography: ScaledTypography) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    disabledSection: {
      opacity: 0.5,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
    },
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
      backgroundColor: colors.background,
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
    changePhotoText: {
      fontFamily: fonts.body,
      fontSize: typography.callout.fontSize,
      color: colors.teal,
      marginTop: spacing.sm,
    },
    fieldGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginBottom: spacing.sm,
    },
    input: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: spacing.sm,
      fontFamily: fonts.body,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      color: colors.foreground,
      backgroundColor: 'transparent',
    },
    usernameHint: {
      fontFamily: fonts.body,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      marginTop: spacing.xs,
    },
    bioInput: {
      minHeight: 80,
      paddingTop: spacing.sm,
    },
    charCount: {
      fontFamily: fonts.body,
      fontSize: typography.caption.fontSize,
      color: colors.secondaryText,
      textAlign: 'right',
      marginTop: spacing.xs,
    },
  })
}
