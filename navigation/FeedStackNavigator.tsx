import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import UserSearchScreen from '@/screens/UserSearchScreen'
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
        options={({ route, navigation }) => ({
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
