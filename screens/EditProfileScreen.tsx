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
import { useProfile } from '@/contexts/ProfileContext'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import ErrorBanner from '@/components/ui/ErrorBanner'
import Spinner from '@/components/ui/Spinner'

const AVATAR_SIZE = 96

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const { profile, updateProfile, uploadAvatar, refetch } = useProfile()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If profile was still loading at mount, fill the fields once it arrives
  const initialized = useRef(!!profile)
  useEffect(() => {
    if (profile && !initialized.current) {
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      initialized.current = true
    }
  }, [profile])

  // The avatar to display — prefer the locally-picked image, then the existing one
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

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Upload avatar if a new image was picked (hook reads file JIT)
      if (selectedImageUri) {
        await uploadAvatar(selectedImageUri)
      }

      // Update text fields in user_data
      await updateProfile({
        display_name: displayName.trim() || undefined,
        bio: bio.trim(),
      })

      // Refetch so the profile context is fresh everywhere
      await refetch()
      navigation.goBack()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      console.error('EditProfileScreen save error:', err)
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }, [selectedImageUri, displayName, bio, uploadAvatar, updateProfile, refetch, navigation])

  // Push Cancel / Save into the native header so there's no custom title bar
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} disabled={isSaving} hitSlop={8}>
          <Ionicons
            name="close"
            size={32}
            style={isSaving ? { opacity: 0.3 } : undefined}
          />
        </Pressable>
      ),
      headerRight: () =>
        isSaving ? (
          <Spinner size={16} />
        ) : (
          <Pressable onPress={handleSave} hitSlop={8}>
            <Ionicons name="checkmark" size={32} />
          </Pressable>
        ),
    })
  }, [navigation, isSaving, handleSave])

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
          {/* Avatar section */}
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

          {/* Form fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={50}
              editable={!isSaving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>BIO</Text>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
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
