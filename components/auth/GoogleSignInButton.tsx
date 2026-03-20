import { Pressable, StyleSheet, Text, View } from 'react-native'
import GoogleIcon from '@/components/ui/GoogleIcon'
import Spinner from '@/components/ui/Spinner'

interface GoogleSignInButtonProps {
  onPress: () => void
  isLoading?: boolean
  label?: string
}

/**
 * Google-branded sign-in button following official branding guidelines.
 * White background, multicolor G logo on the left, Roboto Medium text.
 */
export default function GoogleSignInButton({
  onPress,
  isLoading = false,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      style={[styles.button, isLoading && styles.disabled]}
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconContainer}>
        {isLoading ? (
          <Spinner size={18} color="#5F6368" />
        ) : (
          <GoogleIcon size={20} />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DADCE0',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#3C4043',
    marginRight: 36, // balances the icon so text is visually centered
  },
})
