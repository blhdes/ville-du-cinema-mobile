import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GuestModeProvider } from '@/contexts/GuestModeContext'
import RootNavigator from '@/navigation/RootNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <GuestModeProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </GuestModeProvider>
    </SafeAreaProvider>
  )
}
