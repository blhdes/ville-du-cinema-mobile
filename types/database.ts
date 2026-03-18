/**
 * Ville du Cinéma - Database Types
 * Supabase schema types and API request/response shapes.
 */

/** JSON-serialisable value — mirrors Supabase's generated Json type. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Supported UI locales. `fr` is the default. */
export type Locale = 'fr' | 'en' | 'es'

/**
 * A Letterboxd account that a user has chosen to follow.
 * Stored as a JSONB array in `user_data.followed_users`.
 */
export interface FollowedUser {
  username: string
  display_name?: string
  added_at: string // ISO 8601 timestamp
}

/**
 * A native Village user that has been followed.
 * Stored as a JSONB array in `user_data.followed_village_users`.
 * Uses UUID as the canonical key — never collides with Letterboxd usernames.
 */
export interface FollowedVillageUser {
  user_id: string          // Supabase auth UUID
  username: string | null  // Village handle snapshot at follow time
  display_name: string | null
  avatar_url: string | null
  added_at: string         // ISO 8601 timestamp
}

/**
 * Supabase database schema definition.
 * Used to type the Supabase client via `createClient<Database>()`.
 */
export interface Database {
  public: {
    Tables: {
      user_data: {
        /** Full row returned by SELECT queries. */
        Row: {
          user_id: string
          followed_users: FollowedUser[]
          followed_village_users: FollowedVillageUser[]
          language: Locale
          avatar_url: string | null
          bio: string
          display_name: string | null
          hide_userlist_main: boolean
          feed_grid_columns: 1 | 2 | 3
          hide_watch_notifications: boolean
          username: string | null
          updated_at: string // ISO 8601 timestamp
        }
        /** Shape accepted by INSERT statements. */
        Insert: {
          user_id: string
          followed_users?: FollowedUser[]
          followed_village_users?: FollowedVillageUser[]
          language?: Locale
          avatar_url?: string | null
          bio?: string
          display_name?: string | null
          hide_userlist_main?: boolean
          feed_grid_columns?: 1 | 2 | 3
          hide_watch_notifications?: boolean
          username?: string | null
          updated_at?: string
        }
        /** Shape accepted by UPDATE statements (all fields optional). */
        Update: {
          user_id?: string
          followed_users?: FollowedUser[]
          followed_village_users?: FollowedVillageUser[]
          language?: Locale
          avatar_url?: string | null
          bio?: string
          display_name?: string | null
          hide_userlist_main?: boolean
          feed_grid_columns?: 1 | 2 | 3
          hide_watch_notifications?: boolean
          username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_clippings: {
        /** Full row returned by SELECT queries. */
        Row: {
          id: string
          user_id: string
          quote_text: string
          movie_title: string
          author_name: string
          original_url: string
          created_at: string
        }
        /** Shape accepted by INSERT statements. */
        Insert: {
          id?: string
          user_id: string
          quote_text: string
          movie_title: string
          author_name: string
          original_url: string
          created_at?: string
        }
        /** Shape accepted by UPDATE statements (all fields optional). */
        Update: {
          id?: string
          user_id?: string
          quote_text?: string
          movie_title?: string
          author_name?: string
          original_url?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

/** Full `user_data` row — convenience alias for the Row type. */
export type UserData = Database['public']['Tables']['user_data']['Row']
/** Insert shape for `user_data`. */
export type UserDataInsert = Database['public']['Tables']['user_data']['Insert']
/** Update shape for `user_data`. */
export type UserDataUpdate = Database['public']['Tables']['user_data']['Update']

/**
 * User display preferences stored in `user_data`.
 * Used by `useDisplayPreferences` and `/api/profile/display`.
 */
export interface DisplayPreferences {
  hide_userlist_main: boolean
  feed_grid_columns: 1 | 2 | 3
  hide_watch_notifications: boolean
}

/**
 * Full profile shape returned by `/api/profile`.
 * Combines identity, preferences, and followed-user list.
 */
export interface UserProfile {
  user_id: string
  avatar_url: string | null
  bio: string
  display_name: string | null
  followed_users: FollowedUser[]
  followed_village_users: FollowedVillageUser[]
  language: Locale
  hide_userlist_main: boolean
  feed_grid_columns: 1 | 2 | 3
  hide_watch_notifications: boolean
  username: string | null
  updated_at: string
}

/**
 * Public-safe subset of another Village user's profile.
 * Fetched directly from Supabase user_data by NativeProfileScreen.
 * Excludes all private preferences and followed_* arrays.
 */
export interface VillagePublicProfile {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string
}

/**
 * Public-safe subset of a user profile, returned by `/api/profile/public`.
 * Contains no private preferences or authentication details.
 */
export interface PublicProfile {
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string
  followed_users: FollowedUser[]
  followed_village_users: FollowedVillageUser[]
}

// ---------------------------------------------------------------------------
// Clippings types
// ---------------------------------------------------------------------------

/** A saved review quote from the user's Clippings archive. */
export interface Clipping {
  id: string // uuid
  user_id: string // uuid — FK to Supabase auth
  quote_text: string
  movie_title: string
  author_name: string
  original_url: string
  created_at: string // ISO 8601 timestamp
}

// ---------------------------------------------------------------------------
// Feed types
// ---------------------------------------------------------------------------

/** A single review or watch entry parsed from a Letterboxd RSS feed. */
export interface Review {
  id: string
  username: string
  title: string
  link: string
  pubDate: string
  creator: string
  /** Review body — sanitised HTML with inline formatting preserved */
  review: string
  /** Star rating string, e.g. "★★★½" */
  rating: string
  /** Movie title stripped of year + rating suffix */
  movieTitle: string
  type: 'review' | 'watch'
  /** Letterboxd profile avatar URL extracted from the RSS channel image */
  avatarUrl?: string
}

// ---------------------------------------------------------------------------
// Super-Feed types
// ---------------------------------------------------------------------------

/** A Letterboxd review entry in the unified Super-Feed. */
export interface ReviewFeedItem {
  kind: 'review'
  /** Milliseconds since epoch — derived from pubDate once at mapping time. */
  sortKey: number
  data: Review
}

/** A saved clipping entry in the unified Super-Feed. */
export interface ClippingFeedItem {
  kind: 'clipping'
  /** Milliseconds since epoch — derived from created_at once at mapping time. */
  sortKey: number
  data: Clipping
  /** Avatar of the logged-in user who saved the clipping. */
  ownerAvatarUrl?: string
  /** Display name of the logged-in user. */
  ownerDisplayName: string
}

/** Discriminated union used as the single item type in the Super-Feed FlatList. */
export type FeedItem = ReviewFeedItem | ClippingFeedItem

// ---------------------------------------------------------------------------
// API request types — used to type request bodies in API route handlers.
// ---------------------------------------------------------------------------

/** Body for POST `/api/lists` — adds a followed Letterboxd user. */
export interface AddUserRequest {
  username: string
  display_name?: string
}

/** Body for PUT `/api/lists` — updates a followed user's display name. */
export interface UpdateUserRequest {
  username: string
  display_name?: string
}

/** Body for DELETE `/api/lists` — removes a followed user. */
export interface DeleteUserRequest {
  username: string
}

/** Body for POST `/api/lists/reorder` — sets the display order of followed users. */
export interface ReorderRequest {
  order: string[]
}
