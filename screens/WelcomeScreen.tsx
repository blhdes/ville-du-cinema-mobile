import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@/navigation/types'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getQuoteOfTheWeek } from '@/constants/filmmakerQuotes'
import LogoIcon from '@/components/ui/LogoIcon'
import FilmmakerQuote from '@/components/ui/FilmmakerQuote'
import { fonts, type ThemeColors } from '@/theme'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

const DURATION = 700
const ease = Easing.out(Easing.cubic)

export default function WelcomeScreen({ navigation }: Props) {
  const { enterGuestMode } = useGuestMode()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const quote = getQuoteOfTheWeek()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const markOpacity = useSharedValue(0)
  const markScale = useSharedValue(0.92)
  const quoteOpacity = useSharedValue(0)
  const quoteY = useSharedValue(16)
  const actionsOpacity = useSharedValue(0)
  const actionsY = useSharedValue(16)

  // Tagline crossfade — starts hidden, revealed on logo tap
  const taglineOpacity = useSharedValue(0)
  const taglineY = useSharedValue(-12)
  const markY = useSharedValue(0)
  const [logoReady, setLogoReady] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 800, easing: ease })
    markScale.value = withTiming(1, { duration: 800, easing: ease })

    quoteOpacity.value = withDelay(350, withTiming(1, { duration: DURATION, easing: ease }))
    quoteY.value = withDelay(350, withTiming(0, { duration: DURATION, easing: ease }))

    actionsOpacity.value = withDelay(600, withTiming(1, { duration: DURATION, easing: ease }))
    actionsY.value = withDelay(600, withTiming(0, { duration: DURATION, easing: ease }))

    // Logo is "ready" after its entrance animation completes
    const timer = setTimeout(() => setLogoReady(true), 850)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogoTap = useCallback(() => {
    if (!logoReady || revealed) return
    setRevealed(true)

    // Logo fades out and drifts down gently
    markOpacity.value = withTiming(0, { duration: 900, easing: ease })
    markY.value = withTiming(20, { duration: 900, easing: ease })

    // Tagline drifts down into place from slightly above, fading in
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 800, easing: ease }))
    taglineY.value = withDelay(400, withTiming(0, { duration: 800, easing: ease }))
  }, [logoReady, revealed, markOpacity, markY, taglineOpacity, taglineY])

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }, { translateY: markY.value }],
  }))

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }))

  const quoteStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
    transform: [{ translateY: quoteY.value }],
  }))

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
    transform: [{ translateY: actionsY.value }],
  }))

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* ── Logo + Quote centered together ── */}
      <View style={styles.centerGroup}>
        <View style={styles.logoArea}>
          <Animated.View style={[styles.logoAbsolute, markStyle]}>
            <Pressable onPress={handleLogoTap} disabled={!logoReady || revealed}>
              <LogoIcon size={148} fill={colors.foreground} />
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.logoAbsolute, taglineStyle]} pointerEvents="none">
            <Text style={styles.tagline}>Where cinema{'\n'}meets taste.</Text>
          </Animated.View>
        </View>

        <Animated.View style={quoteStyle}>
          <FilmmakerQuote text={quote.text} author={quote.author} />
        </Animated.View>
      </View>

      {/* ── Actions ── */}
      <Animated.View style={[styles.actions, actionsStyle]}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable style={styles.guestButton} onPress={enterGuestMode}>
          <Text style={styles.guestButtonText}>Continue as guest</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
    },

    // ── Center group ──
    centerGroup: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 48,
    },
    logoArea: {
      height: 148,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    logoAbsolute: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagline: {
      fontFamily: fonts.bodyItalic,
      fontSize: 26,
      lineHeight: 36,
      color: c.foreground,
      textAlign: 'center',
    },

    // ── Actions ──
    actions: {
      gap: 12,
    },
    primaryButton: {
      backgroundColor: c.foreground,
      paddingVertical: 14,
      borderRadius: 4,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: c.background,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 1,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      paddingVertical: 14,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.foreground,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: c.foreground,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 1,
    },
    guestButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    guestButtonText: {
      color: c.secondaryText,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
  })
}
