import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import UserSearchScreen from '@/screens/UserSearchScreen'
import type { FeedStackParamList } from '@/navigation/types'
import { colors, fonts, typography } from '@/theme'

const Stack = createNativeStackNavigator<FeedStackParamList>()

function BackButton() {
  const navigation = useNavigation()
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
      <Ionicons name="chevron-back" size={28} color={colors.foreground} />
    </Pressable>
  )
}

export default function FeedStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: typography.title3.fontSize,
          color: colors.foreground,
        },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerLeft: () => <BackButton />,
      }}
    >
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
        options={{ headerTitle: 'Search' }}
      />
    </Stack.Navigator>
  )
}
