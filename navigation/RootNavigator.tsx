import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'
import AuthStack from '@/navigation/AuthStack'
import AppTabs from '@/navigation/AppTabs'

export default function RootNavigator() {
  const { user, isLoading: isAuthLoading } = useUser()
  const { isGuest, isLoading: isGuestLoading } = useGuestMode()

  if (isAuthLoading || isGuestLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#b22222" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {user || isGuest ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#fdfaf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
