import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '@/contexts/ThemeContext'
import { fonts } from '@/theme'
import { useTypography } from '@/hooks/useTypography'

interface ExpandableAvatarProps {
  avatarUrl?: string | null
  displayName?: string | null
  username?: string | null
  size?: number
}

export default function ExpandableAvatar({
  avatarUrl,
  displayName,
  username,
  size = 72,
}: ExpandableAvatarProps) {
  const [open, setOpen] = useState(false)
  const { width } = useWindowDimensions()
  const { colors } = useTheme()
  const typography = useTypography()

  const initial = (displayName || username || '?')[0].toUpperCase()
  const label = displayName || username || ''
  const avatarStyle = { width: size, height: size, borderRadius: size / 2 }

  return (
    <>
      {avatarUrl ? (
        <Pressable onPress={() => setOpen(true)}>
          <Image source={{ uri: avatarUrl }} style={avatarStyle} cachePolicy="memory-disk" />
        </Pressable>
      ) : (
        <View style={[
          avatarStyle,
          styles.placeholder,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}>
          <Text style={[styles.initial, { fontSize: Math.round(size * 0.38), color: colors.secondaryText }]}>
            {initial}
          </Text>
        </View>
      )}

      {avatarUrl ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: width * 0.6, height: width * 0.6, borderRadius: width * 0.3 }}
              cachePolicy="memory-disk"
            />
            {label ? (
              <Text style={[styles.overlayName, { fontSize: typography.title1.fontSize }]}>{label}</Text>
            ) : null}
          </Pressable>
        </Modal>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.heading,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayName: {
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
  },
})
