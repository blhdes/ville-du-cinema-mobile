import { createDrawerNavigator } from '@react-navigation/drawer'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUserLists } from '@/hooks/useUserLists'
import FeedScreen from '@/screens/FeedScreen'
import UserListPanel from '@/components/UserListPanel'
import { colors, fonts, spacing, typography } from '@/theme'
import type { FeedDrawerParamList } from '@/navigation/types'

const Drawer = createDrawerNavigator<FeedDrawerParamList>()

function DrawerContent({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets()
  const { users, isAuthenticated, addUser, removeUser } = useUserLists()

  return (
    <View style={[styles.drawer, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Users</Text>
        <Pressable onPress={() => navigation.closeDrawer()} hitSlop={8}>
          <Text style={styles.doneButton}>Done</Text>
        </Pressable>
      </View>
      <UserListPanel
        users={users}
        isAuthenticated={isAuthenticated}
        onAdd={addUser}
        onRemove={removeUser}
      />
    </View>
  )
}

export default function FeedDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'left',
        drawerType: 'front',
        drawerStyle: styles.drawerContainer,
        overlayColor: 'rgba(0, 0, 0, 0.3)',
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="FeedMain" component={FeedScreen} />
    </Drawer.Navigator>
  )
}

const styles = StyleSheet.create({
  drawerContainer: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: colors.background,
  },
  drawer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  drawerTitle: {
    fontFamily: fonts.heading,
    fontSize: typography.title2.fontSize,
    lineHeight: typography.title2.lineHeight,
    color: colors.foreground,
  },
  doneButton: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.blue,
  },
})
