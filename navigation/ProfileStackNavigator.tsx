import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@/contexts/ThemeContext'
import ProfileScreen from '@/screens/ProfileScreen'
import ExternalProfileScreen from '@/screens/ExternalProfileScreen'
import UserSearchScreen from '@/screens/UserSearchScreen'
import type { ProfileStackParamList } from '@/navigation/types'
import { fonts, typography } from '@/theme'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

function BackButton() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
      <Ionicons name="chevron-back" size={28} color={colors.foreground} />
    </Pressable>
  )
}

export default function ProfileStackNavigator() {
  const { colors } = useTheme()

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
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
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
