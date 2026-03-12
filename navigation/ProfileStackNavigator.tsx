import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ProfileScreen from '@/screens/ProfileScreen'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import type { ProfileStackParamList } from '@/navigation/types'
import { colors, fonts, typography } from '@/theme'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExternalProfile"
        component={ExternalProfileScreen}
        options={({ route }) => ({
          headerTitle: route.params.username,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            fontFamily: fonts.heading,
            fontSize: typography.title3.fontSize,
            color: colors.foreground,
          },
          headerTintColor: colors.foreground,
          headerBackTitle: '',
          headerShadowVisible: false,
        })}
      />
    </Stack.Navigator>
  )
}
