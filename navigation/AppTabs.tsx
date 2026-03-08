import { Image, StyleSheet } from 'react-native'
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useCallback, useEffect } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AppTabsParamList } from '@/navigation/types'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import FeedTabIcon from '@/components/ui/FeedTabIcon'
import { useProfile } from '@/hooks/useProfile'
import { TabBarProvider, useTabBar } from '@/contexts/TabBarContext'
import { colors } from '@/theme'

const AVATAR_SIZE = 24

const PROFILE_SPRING = { damping: 12, stiffness: 180 }
const BOUNCE_SPRING = { damping: 6, stiffness: 300, mass: 0.6 }

/**
 * Hook that returns an animated style with a pop-bounce when `focused` becomes true.
 * Stable across re-renders — animation state lives in shared values.
 */
function useBounceStyle(focused: boolean) {
  const scale = useSharedValue(1)
  const prevFocused = useSharedValue(focused ? 1 : 0)

  useEffect(() => {
    const wasFocused = prevFocused.value === 1
    prevFocused.value = focused ? 1 : 0

    // Only bounce when transitioning from unfocused → focused
    if (focused && !wasFocused) {
      scale.value = withSequence(
        withTiming(1.35, { duration: 80 }),
        withSpring(1, BOUNCE_SPRING),
      )
    }
  }, [focused, scale, prevFocused])

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
}

/** Feed tab "V" icon with bounce. */
function FeedTabIconAnimated({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const bounceStyle = useBounceStyle(focused)
  return (
    <Animated.View style={bounceStyle}>
      <FeedTabIcon fill={color} size={size} />
    </Animated.View>
  )
}

/** Settings tab icon with bounce. */
function SettingsTabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
  const bounceStyle = useBounceStyle(focused)
  return (
    <Animated.View style={bounceStyle}>
      <Ionicons name="settings-outline" size={size} color={color} />
    </Animated.View>
  )
}

/**
 * Profile avatar: pops to 1.2× and stays while focused, returns to 1× on unfocus.
 */
function ProfileTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { profile } = useProfile()
  const scale = useSharedValue(1)

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(1.35, { duration: 1 }),
        withSpring(1.2, PROFILE_SPRING),
      )
    } else {
      scale.value = withSpring(1, PROFILE_SPRING)
    }
  }, [focused, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (profile?.avatar_url) {
    return (
      <Animated.View style={[styles.avatarWrapper, animatedStyle]}>
        <Image
          source={{ uri: profile.avatar_url }}
          style={styles.avatar}
        />
      </Animated.View>
    )
  }

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="person-outline" size={22} color={color} />
    </Animated.View>
  )
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
  const renderFeedIcon = useCallback(
    ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <FeedTabIconAnimated color={color} size={size} focused={focused} />
    ),
    [],
  )

  const renderProfileIcon = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <ProfileTabIcon color={color} focused={focused} />
    ),
    [],
  )

  const renderSettingsIcon = useCallback(
    ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <SettingsTabIcon color={color} size={size} focused={focused} />
    ),
    [],
  )

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
        options={{ tabBarIcon: renderFeedIcon }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: renderProfileIcon }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: renderSettingsIcon }}
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
