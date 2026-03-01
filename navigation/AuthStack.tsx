import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@/navigation/types'
import WelcomeScreen from '@/screens/WelcomeScreen'
import LoginScreen from '@/screens/LoginScreen'
import SignupScreen from '@/screens/SignupScreen'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  )
}
