import { createContext, useCallback, useContext, useState } from 'react'
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'

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
      translateY.value = withTiming(visible ? 0 : 200, { duration: 250 })
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
