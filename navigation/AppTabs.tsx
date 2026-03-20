import { StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  cancelAnimation,
  Easing,
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useCallback, useEffect } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AppTabsParamList } from '@/navigation/types'
import FeedStackNavigator from '@/navigation/FeedStackNavigator'
import ProfileStackNavigator from '@/navigation/ProfileStackNavigator'
import SettingsScreen from '@/screens/SettingsScreen'
import FeedTabIcon from '@/components/ui/FeedTabIcon'
import { useProfile } from '@/contexts/ProfileContext'
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext'
import { useTheme } from '@/contexts/ThemeContext'

const AVATAR_SIZE = 26
const HIDE_TAB_SCREENS = new Set(['ReviewReader', 'QuotePreview'])
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
  const { profile, isLoading } = useProfile()
  const { colors } = useTheme()
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scales.Profile.value }] }))
  const pulse = useSharedValue(0.4)

  useEffect(() => {
    if (isLoading) {
      pulse.value = withRepeat(
        withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      )
    } else {
      cancelAnimation(pulse)
    }
    return () => { cancelAnimation(pulse) }
  }, [isLoading, pulse])

  if (isLoading) {
    return (
      <Animated.View style={style}>
        <Animated.View
          style={[styles.avatarSkeleton, { backgroundColor: colors.border, opacity: pulse }]}
        />
      </Animated.View>
    )
  }

  if (profile?.avatar_url) {
    return (
      <Animated.View style={[styles.avatarWrapper, style]}>
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} cachePolicy="memory-disk" />
      </Animated.View>
    )
  }
  return (
    <Animated.View style={style}>
      <Ionicons name="person-outline" size={26} color={color} />
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
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[styles.tabBarWrapper, { backgroundColor: colors.background, paddingBottom: insets.bottom }, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  )
}

const Tab = createBottomTabNavigator<AppTabsParamList>()

function AppTabsInner() {
  const { colors } = useTheme()
  const { requestFeedRefresh, isFeedRefreshing, setTabBarVisible } = useTabBar()
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
          height: 46,
          paddingTop: 2,
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
          tabPress: (e) => {
            onFeedPress()

            // Only refresh when already viewing the root FeedScreen.
            // Condition A: Different tab is active → isFocused() is false → normal tab switch.
            // Condition B: Feed tab active but deep in stack → popToTop, no refresh.
            // Condition C: Feed tab active at root → scroll to top + refresh.
            if (!navigation.isFocused()) return

            const state = navigation.getState()
            const feedRoute = state.routes.find((r: { name: string }) => r.name === 'Feed')
            const feedStack = feedRoute?.state

            // feedStack is undefined on first render (only root visible), or index 0 means root
            const isAtFeedRoot = !feedStack || feedStack.index === 0

            if (isAtFeedRoot) {
              // Condition C — already at root: scroll to top + refresh
              e.preventDefault()
              if (!isFeedRefreshing) {
                requestFeedRefresh()
              }
            }
            // Condition B — deep in stack: let default popToTop behavior happen (no refresh)
          },
          focus: () => {
            // Restore tab bar unless Feed stack is on a fullscreen route
            const tabState = navigation.getState()
            const feedRoute = tabState.routes.find((r: { name: string }) => r.name === 'Feed')
            const feedStack = feedRoute?.state
            if (feedStack) {
              const topRoute = feedStack.routes[feedStack.index ?? 0]
              if (HIDE_TAB_SCREENS.has(topRoute.name)) return
            }
            setTabBarVisible(true)
          },
        })}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
        listeners={{
          tabPress: onProfileBounce,
          focus: () => setTabBarVisible(true),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
        listeners={{
          tabPress: onSettingsPress,
          focus: () => setTabBarVisible(true),
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
    overflow: 'hidden',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarSkeleton: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
})
