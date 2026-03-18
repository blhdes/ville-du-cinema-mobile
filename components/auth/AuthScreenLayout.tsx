import { useEffect, useMemo, type ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/contexts/ThemeContext'
import LogoIcon from '@/components/ui/LogoIcon'
import type { ThemeColors } from '@/theme'
import { fonts } from '@/theme'

interface AuthScreenLayoutProps {
  title: string
  onBack: () => void
  children: ReactNode
}

export default function AuthScreenLayout({ title, onBack, children }: AuthScreenLayoutProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const logoOpacity = useSharedValue(0)
  const logoScale = useSharedValue(0.88)

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    logoScale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }))

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={12}>
          <Ionicons
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
            size={Platform.OS === 'ios' ? 30 : 24}
            color={colors.foreground}
          />
        </Pressable>

        <View style={styles.header}>
          <Animated.View style={logoStyle}>
            <LogoIcon size={56} fill={colors.foreground} />
          </Animated.View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.rule} />
        </View>

        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: c.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 32,
      paddingBottom: 32,
    },
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: 8,
      marginLeft: -4,
    },
    header: {
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 32,
      gap: 16,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 32,
      fontWeight: '700',
      color: c.foreground,
    },
    rule: {
      width: 60,
      height: 1,
      backgroundColor: c.foreground,
    },
  })
}
