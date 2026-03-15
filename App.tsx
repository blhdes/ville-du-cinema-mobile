import 'react-native-gesture-handler'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display'
import { EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond'
import { GuestModeProvider } from '@/contexts/GuestModeContext'
import { UserProvider } from '@/contexts/UserProvider'
import { UserListsProvider } from '@/contexts/UserListsProvider'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { DisplayPreferencesProvider } from '@/contexts/DisplayPreferencesContext'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import RootNavigator from '@/navigation/RootNavigator'

SplashScreen.preventAutoHideAsync()

function AppShell() {
  const { resolved, colors, isReady } = useTheme()

  // While the saved preference loads from storage, render a full-screen view
  // matching the theme background. This sits behind the splash so that when
  // hideAsync() fades the splash out, the correct color is already visible
  // (instead of the default white native root view).
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />
  }

  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <UserProvider>
        <UserListsProvider>
          <ProfileProvider>
            <GuestModeProvider>
              <DisplayPreferencesProvider>
                <RootNavigator />
              </DisplayPreferencesProvider>
            </GuestModeProvider>
          </ProfileProvider>
        </UserListsProvider>
      </UserProvider>
    </>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_700Bold,
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
