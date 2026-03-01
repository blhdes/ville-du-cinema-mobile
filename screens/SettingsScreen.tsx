import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useUser } from '@/hooks/useUser'
import { useGuestMode } from '@/contexts/GuestModeContext'

export default function SettingsScreen() {
  const { user, signOut } = useUser()
  const { isGuest, exitGuestMode } = useGuestMode()

  const handleSignOut = async () => {
    if (user) {
      await signOut()
    }
    if (isGuest) {
      await exitGuestMode()
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.status}>
        {user ? `Signed in as ${user.email}` : 'Guest mode'}
      </Text>
      <Pressable style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>
          {user ? 'Sign Out' : 'Exit Guest Mode'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfaf3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    color: '#8c7851',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#b22222',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fdfaf3',
    fontSize: 16,
    fontWeight: '600',
  },
})
