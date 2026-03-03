import { StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { AppTabsParamList } from '@/navigation/types'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import { colors, fonts } from '@/theme'

const Tab = createBottomTabNavigator<AppTabsParamList>()

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.heading,
          fontWeight: '600',
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedDrawerNavigator}
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
