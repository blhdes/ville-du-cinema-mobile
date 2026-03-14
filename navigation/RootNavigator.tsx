import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { useTheme } from '@/contexts/ThemeContext'
import AuthStack from '@/navigation/AuthStack'
import AppTabs from '@/navigation/AppTabs'
import Spinner from '@/components/ui/Spinner'

export default function RootNavigator() {
  const { user, isLoading: isAuthLoading } = useUser()
  const { isGuest, isLoading: isGuestLoading } = useGuestMode()
  const { resolved, colors } = useTheme()

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
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Spinner size={24} />
      </View>
    )
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user || isGuest ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
