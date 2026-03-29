import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * The tab bar is absolutely positioned (for hide-on-scroll animations),
 * so screen content extends behind it. Any UI that sits at the bottom of
 * a screen (sticky inputs, FABs, scroll padding) must add this inset to
 * stay above the tab bar.
 *
 * Value = tab bar height (46) + device safe-area bottom.
 */
const TAB_BAR_HEIGHT = 46

export function useTabBarInset(): number {
  const insets = useSafeAreaInsets()
  return TAB_BAR_HEIGHT + insets.bottom
}
