export type AuthStackParamList = {
  Welcome: undefined
  Login: undefined
  Signup: undefined
}

export type FeedDrawerParamList = {
  FeedMain: undefined
}

export type FeedStackParamList = {
  FeedDrawer: undefined
  ExternalProfile: { username: string }
}

export type AppTabsParamList = {
  Feed: undefined
  Profile: undefined
  Settings: undefined
}

export type RootStackParamList = {
  Auth: undefined
  App: undefined
}
