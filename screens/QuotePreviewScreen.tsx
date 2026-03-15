import { useCallback, useMemo, useRef } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native'
import type ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabBar } from '@/contexts/TabBarContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import ExportCanvas from '@/components/quote/ExportCanvas'
import type { FeedStackParamList } from '@/navigation/types'

type RouteProps = RouteProp<FeedStackParamList, 'QuotePreview'>

export default function QuotePreviewScreen() {
  const { params } = useRoute<RouteProps>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { translateY } = useTabBar()
  const styles = useMemo(() => createStyles(colors), [colors])
  const viewShotRef = useRef<ViewShot>(null)

  // Hide tab bar while this screen is visible
  useFocusEffect(
    useCallback(() => {
      translateY.value = withTiming(100, { duration: 250 })
      return () => { translateY.value = withTiming(0, { duration: 250 }) }
    }, [translateY]),
  )

  const handleShare = useCallback(async () => {
    if (!viewShotRef.current?.capture) return
    try {
      const uri = await viewShotRef.current.capture()
      const available = await Sharing.isAvailableAsync()
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.')
        return
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png' })
    } catch (error) {
      console.error('Share failed:', error)
    }
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Card preview — centered on screen */}
      <View style={styles.previewArea}>
        <ExportCanvas
          ref={viewShotRef}
          quote={params.quote}
          author={params.author}
          username={params.username}
          avatarUrl={params.avatarUrl}
          movieTitle={params.movieTitle}
          rating={params.rating}
        />
      </View>

      {/* Floating share pill */}
      <View style={[styles.pillWrapper, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: colors.foreground },
            pressed && styles.pillPressed,
          ]}
        >
          <Ionicons name="share-outline" size={18} color={colors.background} />
          <Text style={[styles.pillLabel, { color: colors.background }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  )
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    previewArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    pillWrapper: {
      alignItems: 'center',
      paddingTop: spacing.md,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: spacing.lg,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    pillPressed: {
      opacity: 0.75,
    },
    pillLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: typography.callout.fontSize,
      lineHeight: typography.callout.lineHeight,
    },
  })
}
