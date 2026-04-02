import { ScrollView } from 'react-native'
import { useUserLists } from '@/hooks/useUserLists'
import { useTabBarInset } from '@/hooks/useTabBarInset'
import FollowingList from '@/components/profile/FollowingList'

export default function FollowingScreen() {
  const { users: letterboxdUsers, villageUsers } = useUserLists()
  const tabBarInset = useTabBarInset()

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: tabBarInset + 20 }}>
      <FollowingList letterboxdUsers={letterboxdUsers} villageUsers={villageUsers} />
    </ScrollView>
  )
}
