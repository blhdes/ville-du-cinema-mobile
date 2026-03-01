import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { AppTabsParamList } from '@/navigation/types'
import FeedScreen from '@/screens/FeedScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'

const Tab = createBottomTabNavigator<AppTabsParamList>()

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#b22222',
        tabBarInactiveTintColor: '#8c7851',
        tabBarStyle: {
          backgroundColor: '#fdfaf3',
          borderTopColor: '#8c7851',
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
          letterSpacing: 0.5,
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
