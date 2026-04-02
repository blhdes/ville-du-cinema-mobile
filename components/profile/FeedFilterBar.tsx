import { useEffect, useRef } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts, spacing } from '@/theme'
import { useTypography } from '@/hooks/useTypography'

interface FeedFilterBarProps {
  filter: 'all' | 'takes' | 'clippings'
  /** Pass null while content is loading — renders '—'. */
  takesCount: number | null
  clippingsCount: number | null
  onToggle: (f: 'takes' | 'clippings') => void
}

function AnimatedFilterLabel({ label, isActive }: { label: string; isActive: boolean }) {
  const { colors } = useTheme()
  const typography = useTypography()
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isActive ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }, [isActive, anim])

  const color = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.secondaryText, colors.foreground],
  })

  return (
    <Animated.Text
      style={{
        fontFamily: fonts.system,
        fontSize: typography.magazineMeta.fontSize,
        letterSpacing: typography.magazineMeta.letterSpacing,
        color,
      }}
    >
      {label}
    </Animated.Text>
  )
}

export default function FeedFilterBar({ filter, takesCount, clippingsCount, onToggle }: FeedFilterBarProps) {
  const { colors } = useTheme()
  const typography = useTypography()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Pressable onPress={() => onToggle('takes')} hitSlop={4}>
        <AnimatedFilterLabel
          label={takesCount === null ? '— takes' : `${takesCount} takes`}
          isActive={filter === 'takes'}
        />
      </Pressable>

      <Animated.Text
        style={{
          fontFamily: fonts.system,
          fontSize: typography.magazineMeta.fontSize,
          color: colors.secondaryText,
        }}
      >
        ·
      </Animated.Text>

      <Pressable onPress={() => onToggle('clippings')} hitSlop={4}>
        <AnimatedFilterLabel
          label={clippingsCount === null ? '— clippings' : `${clippingsCount} clippings`}
          isActive={filter === 'clippings'}
        />
      </Pressable>
    </View>
  )
}
