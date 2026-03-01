import { StyleSheet, Text, View } from 'react-native'
import { useUser } from '@/hooks/useUser'

export default function ProfileScreen() {
  const { user } = useUser()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.status}>
        {user ? user.email : 'Guest mode — sign in to access your profile'}
      </Text>
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
    textAlign: 'center',
  },
})
