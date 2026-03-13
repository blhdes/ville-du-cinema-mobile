import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import ProfileScreen from '@/screens/ProfileScreen'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import UserSearchScreen from '@/screens/UserSearchScreen'
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
        options={({ route, navigation }) => ({
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
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('UserSearch')}
              hitSlop={8}
            >
              <Ionicons name="search-outline" size={20} color={colors.foreground} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="UserSearch"
        component={UserSearchScreen}
        options={{
          headerTitle: 'Search',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            fontFamily: fonts.heading,
            fontSize: typography.title3.fontSize,
            color: colors.foreground,
          },
          headerTintColor: colors.foreground,
          headerBackTitle: '',
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  )
}
