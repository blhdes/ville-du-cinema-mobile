import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { AppTabsParamList } from '@/navigation/types'
import FeedScreen from '@/screens/FeedScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import { colors, fonts } from '@/theme'

const Tab = createBottomTabNavigator<AppTabsParamList>()

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.sepia,
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.black,
          borderTopWidth: 2,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.heading,
          fontWeight: '600',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarLabel: 'Feed' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  )
}
