import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '@/navigation/types'
import { useGuestMode } from '@/contexts/GuestModeContext'
import { getQuoteOfTheWeek } from '@/constants/filmmakerQuotes'

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>

export default function WelcomeScreen({ navigation }: Props) {
  const { enterGuestMode } = useGuestMode()
  const quote = getQuoteOfTheWeek()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Film Review</Text>
        <View style={styles.rule} />
        <Text style={styles.title}>Village</Text>
        <Text style={styles.preposition}>du</Text>
        <Text style={styles.title}>Cinema</Text>
        <View style={styles.rule} />
      </View>

      <View style={styles.quoteContainer}>
        <Text style={styles.quoteAuthor}>— {quote.author}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable style={styles.guestButton} onPress={enterGuestMode}>
          <Text style={styles.guestButtonText}>Continue as guest</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfaf3',
    justifyContent: 'center',
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  label: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: '#8c7851',
    marginBottom: 12,
  },
  rule: {
    width: 80,
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 12,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 42,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  preposition: {
    fontFamily: 'serif',
    fontSize: 20,
    fontStyle: 'italic',
    color: '#8c7851',
    marginVertical: 2,
  },
  quoteContainer: {
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  quoteAuthor: {
    fontSize: 13,
    color: '#8c7851',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fdfaf3',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  guestButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#8c7851',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
})
