import 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display'
import { EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond'
import { GuestModeProvider } from '@/contexts/GuestModeContext'
import { UserProvider } from '@/contexts/UserProvider'
import { UserListsProvider } from '@/contexts/UserListsProvider'
import { DisplayPreferencesProvider } from '@/contexts/DisplayPreferencesContext'
import RootNavigator from '@/navigation/RootNavigator'

SplashScreen.preventAutoHideAsync()

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
      <UserProvider>
        <UserListsProvider>
          <GuestModeProvider>
            <DisplayPreferencesProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </DisplayPreferencesProvider>
          </GuestModeProvider>
        </UserListsProvider>
      </UserProvider>
    </SafeAreaProvider>
  )
}
