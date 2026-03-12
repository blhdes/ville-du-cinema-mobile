import { Image, StyleSheet } from 'react-native'
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  makeMutable,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useCallback } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AppTabsParamList } from '@/navigation/types'
import FeedStackNavigator from '@/navigation/FeedStackNavigator'
import ProfileStackNavigator from '@/navigation/ProfileStackNavigator'
import SettingsScreen from '@/screens/SettingsScreen'
import FeedTabIcon from '@/components/ui/FeedTabIcon'
import { useProfile } from '@/hooks/useProfile'
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext'
import { colors } from '@/theme'

const AVATAR_SIZE = 24
const BOUNCE_SPRING = { damping: 14, stiffness: 300, mass: 0.6 }
const PROFILE_IN_SPRING = { damping: 14, stiffness: 260, mass: 0.6 }
const PROFILE_OUT_SPRING = { damping: 14, stiffness: 260, mass: 0.6 }

// Module-level shared values — persist across remounts
const scales = {
  Feed: makeMutable(1),
  Profile: makeMutable(1),
  Settings: makeMutable(1),
}

function onTabFocus(tab: keyof typeof scales) {
  for (const [name, sv] of Object.entries(scales)) {
    if (name === tab) {
      // Bounce the target icon
      const settle = name === 'Profile' ? 1.08 : 1
      const spring = name === 'Profile' ? PROFILE_IN_SPRING : BOUNCE_SPRING
      sv.value = withSequence(
        withTiming(1.18, { duration: 140 }),
        withSpring(settle, spring),
      )
    } else if (name === 'Profile') {
      // Profile shrinks back quickly when leaving
      sv.value = withSpring(1, PROFILE_OUT_SPRING)
    }
    // Non-profile, non-target icons stay at 1 (they never left)
  }
}

// ── Icon components — just read module-level shared values ──

function FeedIcon({ color, size }: { color: string; size: number }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scales.Feed.value }] }))
  return (
    <Animated.View style={style}>
      <FeedTabIcon fill={color} size={size} />
    </Animated.View>
  )
}

function ProfileIcon({ color }: { color: string }) {
  const { profile } = useProfile()
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scales.Profile.value }] }))

  if (profile?.avatar_url) {
    return (
      <Animated.View style={[styles.avatarWrapper, style]}>
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      </Animated.View>
    )
  }
  return (
    <Animated.View style={style}>
      <Ionicons name="person-outline" size={22} color={color} />
    </Animated.View>
  )
}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scales.Settings.value }] }))
  return (
    <Animated.View style={style}>
      <Ionicons name="settings-outline" size={size} color={color} />
    </Animated.View>
  )
}

// ── Tab bar & navigator ──

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
  const { requestFeedRefresh, isFeedRefreshing } = useTabBar()
  const onFeedPress = useCallback(() => onTabFocus('Feed'), [])
  const onProfileBounce = useCallback(() => onTabFocus('Profile'), [])
  const onSettingsPress = useCallback(() => onTabFocus('Settings'), [])

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
          height: 54,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          minWidth: 64,
          minHeight: 48,
        },
        tabBarIconStyle: {
          width: 48,
          height: 48,
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <FeedIcon color={color} size={size} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            onFeedPress()
            if (navigation.isFocused() && !isFeedRefreshing) {
              requestFeedRefresh()
            }
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
        listeners={{ tabPress: onProfileBounce }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
        listeners={{ tabPress: onSettingsPress }}
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
    overflow: 'hidden',
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
