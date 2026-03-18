import { useCallback, useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import * as SplashScreen from 'expo-splash-screen'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useTheme } from '@/contexts/ThemeContext'
import AuthStack from '@/navigation/AuthStack'
import AppTabs from '@/navigation/AppTabs'

export default function RootNavigator() {
  const { user, isLoading: isAuthLoading } = useUser()
  const { isGuest, isLoading: isGuestLoading } = useGuestMode()
  const { resolved, colors } = useTheme()
  const splashHidden = useRef(false)

  // Safety net: if neither the auth screen nor FeedScreen calls hideAsync within
  // 3 seconds (e.g. FeedScreen errors and never mounts), force the splash away.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splashHidden.current) {
        splashHidden.current = true
        SplashScreen.hideAsync()
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Hide splash once the auth screen paints (logged-in flow is handled by FeedScreen)
  const onAuthLayout = useCallback(() => {
    if (!splashHidden.current) {
      splashHidden.current = true
      SplashScreen.hideAsync()
    }
  }, [])

  const navTheme = useMemo(() => {
    const base = resolved === 'dark' ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.teal,
        background: colors.background,
        card: colors.background,
        text: colors.foreground,
        border: colors.border,
        notification: colors.teal,
      },
    }
  }, [resolved, colors])

  if (isAuthLoading || isGuestLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]} />
    )
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user || isGuest ? (
        <AppTabs />
      ) : (
        <View style={styles.authWrapper} onLayout={onAuthLayout}>
          <AuthStack />
        </View>
      )}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authWrapper: {
    flex: 1,
  },
})
