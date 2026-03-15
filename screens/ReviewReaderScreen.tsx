import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, withTiming } from 'react-native-reanimated'
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@/contexts/ThemeContext'
import { useTabBar } from '@/contexts/TabBarContext'
import { fonts, spacing, typography, type ThemeColors } from '@/theme'
import type { FeedStackParamList } from '@/navigation/types'

type RouteProps = RouteProp<FeedStackParamList, 'ReviewReader'>

// ---------------------------------------------------------------------------
// Word parsing
// ---------------------------------------------------------------------------

interface WordToken {
  text: string
  paragraphEnd: boolean
}

/** Decode common HTML entities into their real characters. */
function decodeEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&ndash;': '\u2013',
    '&mdash;': '\u2014',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&hellip;': '\u2026',
    '&nbsp;': ' ',
  }
  return text
    .replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-z]+);/gi, (match, dec, hex) => {
      if (dec) return String.fromCharCode(Number(dec))
      if (hex) return String.fromCharCode(parseInt(hex, 16))
      return entities[match] ?? match
    })
}

function parseWords(html: string): WordToken[] {
  const plain = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
  ).trim()

  const tokens: WordToken[] = []
  const paragraphs = plain.split(/\n\n+/)

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; i++) {
      tokens.push({
        text: words[i],
        paragraphEnd: i === words.length - 1,
      })
    }
  }

  return tokens
}

// ---------------------------------------------------------------------------
// Hit-testing
// ---------------------------------------------------------------------------

type WordLayout = { x: number; y: number; width: number; height: number }

function findWordAtPosition(
  x: number,
  y: number,
  layouts: Array<WordLayout | null>,
): number {
  for (let i = 0; i < layouts.length; i++) {
    const l = layouts[i]
    if (!l) continue
    if (x >= l.x && x <= l.x + l.width && y >= l.y && y <= l.y + l.height) {
      return i
    }
  }
  let nearest = -1
  let nearestDist = Infinity
  for (let i = 0; i < layouts.length; i++) {
    const l = layouts[i]
    if (!l) continue
    if (y >= l.y - 6 && y <= l.y + l.height + 6) {
      const centerX = l.x + l.width / 2
      const dist = Math.abs(x - centerX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    }
  }
  return nearest
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ReviewReaderScreen() {
  const { params } = useRoute<RouteProps>()
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { translateY } = useTabBar()
  const styles = useMemo(() => createStyles(colors), [colors])

  const words = useMemo(() => parseWords(params.reviewText), [params.reviewText])

  const [selectedRange, setSelectedRange] = useState<{
    start: number
    end: number
  } | null>(null)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  // Ref mirror of selectedRange so gesture callbacks stay stable
  const selectedRangeRef = useRef<{ start: number; end: number } | null>(null)
  const wordLayoutsRef = useRef<Array<WordLayout | null>>([])
  const anchorRef = useRef(-1)
  const lastFocusRef = useRef(-1)

  const updateRange = useCallback(
    (range: { start: number; end: number } | null) => {
      selectedRangeRef.current = range
      setSelectedRange(range)
    },
    [],
  )

  // Hide the bottom tab bar
  useFocusEffect(
    useCallback(() => {
      translateY.value = withTiming(100, { duration: 250 })
      return () => {
        translateY.value = withTiming(0, { duration: 250 })
      }
    }, [translateY]),
  )

  // ── Derived state ──

  const hasSelection = selectedRange !== null

  const selectedText = useMemo(() => {
    if (!selectedRange) return ''
    return words
      .slice(selectedRange.start, selectedRange.end + 1)
      .map((w) => w.text)
      .join(' ')
  }, [words, selectedRange])

  const handleCreateCard = useCallback(() => {
    if (!selectedText) return
    navigation.navigate('QuotePreview', {
      quote: selectedText,
      author: params.author,
      username: params.username,
      avatarUrl: params.avatarUrl,
      movieTitle: params.movieTitle,
      rating: params.rating,
    })
  }, [navigation, selectedText, params])

  // ── Header action — show checkmark icon when text is selected ──

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        hasSelection ? (
          <Pressable onPress={handleCreateCard} hitSlop={12}>
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={colors.teal}
            />
          </Pressable>
        ) : null,
    })
  }, [navigation, hasSelection, handleCreateCard, colors.teal])

  // ── Gesture callbacks ──

  const handleGestureStart = useCallback(
    (x: number, y: number) => {
      setScrollEnabled(false)
      const idx = findWordAtPosition(x, y, wordLayoutsRef.current)
      if (idx >= 0) {
        anchorRef.current = idx
        lastFocusRef.current = idx
        updateRange({ start: idx, end: idx })
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    },
    [updateRange],
  )

  const handleGestureUpdate = useCallback(
    (x: number, y: number) => {
      const idx = findWordAtPosition(x, y, wordLayoutsRef.current)
      if (idx >= 0 && idx !== lastFocusRef.current) {
        lastFocusRef.current = idx
        const anchor = anchorRef.current
        updateRange({
          start: Math.min(anchor, idx),
          end: Math.max(anchor, idx),
        })
        Haptics.selectionAsync()
      }
    },
    [updateRange],
  )

  const handleGestureEnd = useCallback(() => {
    setScrollEnabled(true)
  }, [])

  // Tap on a selected word → clear selection
  const handleTap = useCallback(
    (x: number, y: number) => {
      const idx = findWordAtPosition(x, y, wordLayoutsRef.current)
      const range = selectedRangeRef.current
      if (idx >= 0 && range && idx >= range.start && idx <= range.end) {
        updateRange(null)
        Haptics.selectionAsync()
      }
    },
    [updateRange],
  )

  // ── Composed gesture: long-press pan to select, tap to deselect ──

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart((e) => runOnJS(handleGestureStart)(e.x, e.y))
        .onUpdate((e) => runOnJS(handleGestureUpdate)(e.x, e.y))
        .onEnd(() => runOnJS(handleGestureEnd)()),
    [handleGestureStart, handleGestureUpdate, handleGestureEnd],
  )

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((e) => runOnJS(handleTap)(e.x, e.y)),
    [handleTap],
  )

  const composed = useMemo(
    () => Gesture.Exclusive(pan, tap),
    [pan, tap],
  )

  const storeWordLayout = useCallback(
    (index: number, layout: WordLayout) => {
      wordLayoutsRef.current[index] = layout
    },
    [],
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.movieTitle}>{params.movieTitle}</Text>
        <Text style={styles.meta}>
          BY {params.author.toUpperCase()}
          {params.rating ? ` \u00B7 ${params.rating}` : ''}
        </Text>
        <Text style={styles.hint}>Hold & drag to highlight text</Text>

        {/* Swipe-to-highlight word grid */}
        <GestureDetector gesture={composed}>
          <Animated.View style={styles.wordContainer}>
            {words.map((token, i) => {
              const isSelected =
                selectedRange !== null &&
                i >= selectedRange.start &&
                i <= selectedRange.end
              return (
                <Fragment key={i}>
                  <View
                    onLayout={(e) => storeWordLayout(i, e.nativeEvent.layout)}
                    style={styles.wordWrapper}
                  >
                    <Text
                      style={[
                        styles.wordText,
                        isSelected ? styles.wordSelected : styles.wordDimmed,
                      ]}
                    >
                      {token.text}
                    </Text>
                  </View>
                  {token.paragraphEnd && (
                    <View style={styles.paragraphBreak} />
                  )}
                </Fragment>
              )
            })}
          </Animated.View>
        </GestureDetector>
      </ScrollView>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    movieTitle: {
      fontFamily: fonts.heading,
      fontSize: typography.title2.fontSize,
      lineHeight: typography.title2.lineHeight,
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: typography.magazineMeta.fontSize,
      lineHeight: typography.magazineMeta.lineHeight,
      letterSpacing: typography.magazineMeta.letterSpacing,
      color: colors.secondaryText,
      marginBottom: spacing.lg,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      color: colors.secondaryText,
      fontStyle: 'italic',
      marginBottom: spacing.md,
    },
    wordContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    wordWrapper: {
      paddingVertical: 3,
      paddingHorizontal: 2,
      marginRight: 5,
      marginBottom: 2,
    },
    wordText: {
      fontFamily: fonts.body,
      fontSize: typography.magazineBody.fontSize,
      lineHeight: typography.magazineBody.lineHeight,
      color: colors.foreground,
    },
    wordSelected: {
      opacity: 1,
    },
    wordDimmed: {
      opacity: 0.35,
    },
    paragraphBreak: {
      width: '100%',
      height: spacing.md,
    },
  })
}
