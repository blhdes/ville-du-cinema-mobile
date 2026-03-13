import type { NavigatorScreenParams } from '@react-navigation/native'

export type AuthStackParamList = {
  Welcome: undefined
  Login: undefined
  Signup: undefined
}

export type FeedDrawerParamList = {
  FeedMain: undefined
}

export type FeedStackParamList = {
  FeedDrawer: NavigatorScreenParams<FeedDrawerParamList> | undefined
  ExternalProfile: { username: string }
  UserSearch: undefined
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  ExternalProfile: { username: string }
  UserSearch: undefined
}

export type AppTabsParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList> | undefined
  Profile: undefined
  Settings: undefined
}

export type RootStackParamList = {
  Auth: undefined
  App: undefined
}
