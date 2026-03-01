import { StyleSheet, Text, View } from 'react-native'
import { useUser } from '@/hooks/useUser'

export default function FeedScreen() {
  const { user } = useUser()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Village du Cinema</Text>
      <Text style={styles.subtitle}>Recent Feed</Text>
      <Text style={styles.status}>
        {user ? `Signed in as ${user.email}` : 'Guest mode'}
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
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'serif',
    fontSize: 18,
    color: '#8c7851',
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    color: '#8c7851',
    fontStyle: 'italic',
  },
})
