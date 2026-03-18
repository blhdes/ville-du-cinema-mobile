import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@/navigation/types'
import { supabase } from '@/lib/supabase/client'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import AuthScreenLayout from '@/components/auth/AuthScreenLayout'
import ErrorBanner from '@/components/ui/ErrorBanner'
import Divider from '@/components/ui/Divider'
import Spinner from '@/components/ui/Spinner'
import type { ThemeColors } from '@/theme'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const { enterGuestMode } = useGuestMode()
  const { colors } = useTheme()
  const { signIn: googleSignIn, isLoading: isGoogleLoading, error: googleError, clearError: clearGoogleError } = useGoogleAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const styles = useMemo(() => makeStyles(colors), [colors])

  const displayError = error ?? googleError

  const handleLogin = async () => {
    if (!email.trim() || !password) return

    setError(null)
    setIsLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setIsLoading(false)

    if (authError) {
      setError('Invalid email or password')
    }
  }

  const handleDismissError = () => {
    setError(null)
    clearGoogleError()
  }

  return (
    <AuthScreenLayout title="Sign In" onBack={() => navigation.goBack()}>
      {displayError && (
        <ErrorBanner message={displayError} onDismiss={handleDismissError} />
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={colors.secondaryText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isLoading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.secondaryText}
          secureTextEntry
          textContentType="password"
          editable={!isLoading}
          onSubmitEditing={handleLogin}
        />

        <Pressable
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner size={18} color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Sign In</Text>
          )}
        </Pressable>

        <Divider label="or" marginVertical={8} />

        <Pressable
          style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
          onPress={googleSignIn}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Spinner size={18} color={colors.foreground} />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
          </Text>
        </Pressable>

        <Pressable style={styles.guestButton} onPress={enterGuestMode}>
          <Text style={styles.guestText}>Continue as guest</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  )
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    form: {
      gap: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.foreground,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.foreground,
      backgroundColor: c.backgroundSecondary,
    },
    submitButton: {
      backgroundColor: c.foreground,
      paddingVertical: 14,
      borderRadius: 4,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: c.background,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 1,
    },
    googleButton: {
      borderWidth: 1.5,
      borderColor: c.foreground,
      paddingVertical: 14,
      borderRadius: 4,
      alignItems: 'center',
    },
    googleButtonText: {
      color: c.foreground,
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      marginTop: 32,
      alignItems: 'center',
      gap: 16,
    },
    linkText: {
      fontSize: 14,
      color: c.secondaryText,
    },
    linkBold: {
      fontWeight: '700',
      color: c.foreground,
      textDecorationLine: 'underline',
    },
    guestButton: {
      paddingVertical: 8,
    },
    guestText: {
      color: c.secondaryText,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
  })
}
