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

export type CreateTakeParams = {
  /** Pre-fill the film when creating a Take from a Film Card. */
  tmdbId?: number
  movieTitle?: string
  posterPath?: string | null
}

export type TakeDetailParams = {
  takeId: string
  /** Author display info — already resolved by the card that navigated here. */
  author?: {
    avatarUrl?: string
    displayName: string
    userId?: string
    username?: string
  }
}

export type FeedStackParamList = {
  FeedDrawer: NavigatorScreenParams<FeedDrawerParamList> | undefined
  ExternalProfile: { username: string }
  NativeProfile: { userId: string; username?: string }
  UserSearch: undefined
  ReviewReader: ReviewReaderParams
  QuotePreview: QuotePreviewParams
  FilmCard: FilmCardParams
  CreateTake: CreateTakeParams | undefined
  TakeDetail: TakeDetailParams
  SavedFilms: SavedFilmsParams
}

export type SavedFilmsParams = {
  userId: string
  username?: string
}

export type FavoriteFilmPickerParams = {
  /** Which slot (1–4) to fill. */
  position: number
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
  CreateTake: CreateTakeParams | undefined
  TakeDetail: TakeDetailParams
  SavedFilms: SavedFilmsParams
  FavoriteFilmPicker: FavoriteFilmPickerParams
}

export type DiscoverStackParamList = {
  DiscoverMain: undefined
  ExternalProfile: { username: string }
  NativeProfile: { userId: string; username?: string }
  UserSearch: undefined
  ReviewReader: ReviewReaderParams
  QuotePreview: QuotePreviewParams
  FilmCard: FilmCardParams
  CreateTake: CreateTakeParams | undefined
  TakeDetail: TakeDetailParams
  SavedFilms: SavedFilmsParams
}

export type AppTabsParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList> | undefined
  Discover: NavigatorScreenParams<DiscoverStackParamList> | undefined
  Profile: undefined
  Settings: undefined
}

export type RootStackParamList = {
  Auth: undefined
  App: undefined
}
