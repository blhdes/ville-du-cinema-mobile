import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import type { FeedStackParamList } from '@/navigation/types'
import { colors, fonts, typography } from '@/theme'

const Stack = createNativeStackNavigator<FeedStackParamList>()

export default function FeedStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FeedDrawer"
        component={FeedDrawerNavigator}
        options={{ headerShown: false, title: '' }}
      />
      <Stack.Screen
        name="ExternalProfile"
        component={ExternalProfileScreen}
        options={({ route }) => ({
          headerTitle: `@${route.params.username}`,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            fontFamily: fonts.heading,
            fontSize: typography.title3.fontSize,
            color: colors.foreground,
          },
          headerTintColor: colors.foreground,
          headerBackTitleVisible: false,
          headerShadowVisible: false,
        })}
      />
    </Stack.Navigator>
  )
}
