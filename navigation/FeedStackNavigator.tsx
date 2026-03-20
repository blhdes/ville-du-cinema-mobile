import { useCallback } from 'react'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import type { EventArg } from '@react-navigation/native'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabBar } from '@/contexts/TabBarContext'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import NativeProfileScreen from '@/screens/NativeProfileScreen'
import UserSearchScreen from '@/screens/UserSearchScreen'
import ReviewReaderScreen from '@/screens/ReviewReaderScreen'
import QuotePreviewScreen from '@/screens/QuotePreviewScreen'
import type { FeedStackParamList } from '@/navigation/types'
import { fonts } from '@/theme'
import { useTypography } from '@/hooks/useTypography'

const Stack = createNativeStackNavigator<FeedStackParamList>()

function BackButton() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
      <Ionicons name="chevron-back" size={28} color={colors.foreground} />
    </Pressable>
  )
}

const HIDE_TAB_SCREENS = new Set<string>(['ReviewReader', 'QuotePreview'])

export default function FeedStackNavigator() {
  const { colors } = useTheme()
  const typography = useTypography()
  const { setTabBarVisible } = useTabBar()

  const handleStateChange = useCallback(
    (e: EventArg<'state', false, { state: { routes: Array<{ name: string }> } }>) => {
      const routes = e.data.state.routes
      const topRoute = routes[routes.length - 1]
      setTabBarVisible(!HIDE_TAB_SCREENS.has(topRoute.name))
    },
    [setTabBarVisible],
  )

  return (
    <Stack.Navigator
      screenListeners={{ state: handleStateChange }}
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
        name="NativeProfile"
        component={NativeProfileScreen}
        options={({ route }) => ({
          headerTitle: route.params.username ? `@${route.params.username}` : 'Profile',
        })}
      />
      <Stack.Screen
        name="UserSearch"
        component={UserSearchScreen}
        options={{ headerTitle: 'Search' }}
      />
      <Stack.Screen
        name="ReviewReader"
        component={ReviewReaderScreen}
        options={{ headerTitle: '' }}
      />
      <Stack.Screen
        name="QuotePreview"
        component={QuotePreviewScreen}
        options={{ headerTitle: 'Quote' }}
      />
    </Stack.Navigator>
  )
}
