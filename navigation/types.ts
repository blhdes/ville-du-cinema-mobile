import type { NavigatorScreenParams } from '@react-navigation/native'

export type AuthStackParamList = {
  Welcome: undefined
  Login: undefined
  Signup: undefined
}

export type FeedDrawerParamList = {
  FeedMain: undefined
}

export type ReviewReaderParams = {
  reviewText: string
  author: string
  username: string
  avatarUrl?: string
  movieTitle: string
  rating: string
  original_url: string
}

export type QuotePreviewParams = {
  quote: string
  author: string
  username: string
  avatarUrl?: string
  movieTitle: string
  rating: string
}

export type FilmCardParams = {
  tmdbId: number
  movieTitle: string
}

export type FeedStackParamList = {
  FeedDrawer: NavigatorScreenParams<FeedDrawerParamList> | undefined
  ExternalProfile: { username: string }
  NativeProfile: { userId: string; username?: string }
  UserSearch: undefined
  ReviewReader: ReviewReaderParams
  QuotePreview: QuotePreviewParams
  FilmCard: FilmCardParams
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  EditProfile: undefined
  ExternalProfile: { username: string }
  NativeProfile: { userId: string; username?: string }
  UserSearch: undefined
  ReviewReader: ReviewReaderParams
  QuotePreview: QuotePreviewParams
  FilmCard: FilmCardParams
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
