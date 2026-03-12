import { Text, View, StyleSheet } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FeedDrawerNavigator from '@/navigation/FeedDrawerNavigator'
import type { FeedStackParamList } from '@/navigation/types'
import { colors, fonts, typography } from '@/theme'

const Stack = createNativeStackNavigator<FeedStackParamList>()

function ExternalProfilePlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>TODO</Text>
    </View>
  )
}

export default function FeedStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FeedDrawer"
        component={FeedDrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ExternalProfile"
        component={ExternalProfilePlaceholder}
        options={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: {
            fontFamily: fonts.heading,
            fontSize: typography.title3.fontSize,
            color: colors.foreground,
          },
          headerTintColor: colors.foreground,
          headerBackTitle: '',
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    color: colors.secondaryText,
  },
})
