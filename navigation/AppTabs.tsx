import { Image, StyleSheet, View } from 'react-native'
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AppTabsParamList } from '@/navigation/types'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import FeedTabIcon from '@/components/ui/FeedTabIcon'
import { useProfile } from '@/hooks/useProfile'
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext'
import { colors } from '@/theme'

const AVATAR_SIZE = 28

function ProfileTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { profile } = useProfile()

  if (profile?.avatar_url) {
    return (
      <View style={[styles.avatarWrapper, focused && styles.avatarWrapperFocused]}>
        <Image
          source={{ uri: profile.avatar_url }}
          style={styles.avatar}
        />
      </View>
    )
  }

  return <Ionicons name="person-outline" size={24} color={color} />
}

function AnimatedTabBar(props: BottomTabBarProps) {
  const { translateY } = useTabBar()
  const insets = useSafeAreaInsets()

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom }, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  )
}

const Tab = createBottomTabNavigator<AppTabsParamList>()

function AppTabsInner() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 49,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedDrawerNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <FeedTabIcon fill={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => <ProfileTabIcon color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export default function AppTabs() {
  return (
    <TabBarProvider>
      <AppTabsInner />
    </TabBarProvider>
  )
}

const styles = StyleSheet.create({
  avatarWrapper: {
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarWrapperFocused: {
    borderColor: colors.foreground,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
})
