import { createContext, useCallback, useContext, useState } from 'react'
import { cancelAnimation, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'

interface TabBarContextValue {
  translateY: SharedValue<number>
  setTabBarVisible: (visible: boolean) => void
  feedRefreshRequested: number
  isFeedRefreshing: boolean
  setIsFeedRefreshing: (value: boolean) => void
  requestFeedRefresh: () => void
}

const TabBarContext = createContext<TabBarContextValue | null>(null)

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(0)
  const [feedRefreshRequested, setFeedRefreshRequested] = useState(0)
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false)

  const setTabBarVisible = useCallback(
    (visible: boolean) => {
      // Kill any in-flight spring/timing from the scroll handler before overriding.
      cancelAnimation(translateY)
      if (visible) {
        translateY.value = withTiming(0, { duration: 250 })
      } else {
        // Hide instantly so the bar is gone before the screen transition starts
        translateY.value = 200
      }
    },
    [translateY],
  )

  const requestFeedRefresh = useCallback(() => {
    setFeedRefreshRequested((prev) => prev + 1)
  }, [])

  return (
    <TabBarContext.Provider value={{ translateY, setTabBarVisible, feedRefreshRequested, isFeedRefreshing, setIsFeedRefreshing, requestFeedRefresh }}>
      {children}
    </TabBarContext.Provider>
  )
}

export function useTabBar() {
  const ctx = useContext(TabBarContext)
  if (!ctx) throw new Error('useTabBar must be used within TabBarProvider')
  return ctx
}
