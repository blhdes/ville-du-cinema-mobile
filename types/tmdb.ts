// ---------------------------------------------------------------------------
// TMDB API response shapes
// ---------------------------------------------------------------------------

/** A single genre tag. */
export interface TmdbGenre {
  id: number
  name: string
}

/** A cast or crew member from the credits endpoint. */
export interface TmdbCreditPerson {
  id: number
  name: string
  profile_path: string | null
  /** Present on cast entries. */
  character?: string
  /** Present on crew entries (e.g. "Director", "Screenplay"). */
  job?: string
}

/** A video result (trailers, teasers, etc.) from the videos endpoint. */
export interface TmdbVideo {
  id: string
  key: string
  name: string
  site: string // "YouTube", "Vimeo", etc.
  type: string // "Trailer", "Teaser", "Clip", etc.
}

/** The shape returned by GET /movie/{id} with append_to_response=credits,videos. */
export interface TmdbMovieDetail {
  id: number
  imdb_id: string | null
  title: string
  original_title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string // "2024-06-15"
  runtime: number | null
  vote_average: number
  vote_count: number
  genres: TmdbGenre[]
  credits: {
    cast: TmdbCreditPerson[]
    crew: TmdbCreditPerson[]
  }
  videos: {
    results: TmdbVideo[]
  }
}

/** A single result from GET /search/movie. */
export interface TmdbSearchResult {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  overview: string | null
  vote_average: number
}

/** The paginated wrapper returned by search/trending endpoints. */
export interface TmdbPaginatedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}
