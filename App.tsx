import 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ActivityIndicator, View } from 'react-native'
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display'
import { EBGaramond_400Regular, EBGaramond_400Regular_Italic, EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond'
import { GuestModeProvider } from '@/contexts/GuestModeContext'
import RootNavigator from '@/navigation/RootNavigator'
import { colors } from '@/theme'

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <GuestModeProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </GuestModeProvider>
    </SafeAreaProvider>
  )
}
