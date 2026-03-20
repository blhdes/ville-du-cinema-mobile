import { useEffect, useState, useCallback } from 'react'
import { useUser } from './useUser'
import { supabase } from '@/lib/supabase/client'
import type { UserProfile, DisplayPreferences } from '@/types/database'

export interface UseProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (data: { bio?: string; display_name?: string; username?: string }) => Promise<void>
  updateDisplayPreferences: (data: Partial<DisplayPreferences>) => Promise<void>
  uploadAvatar: (uri: string) => Promise<string>
  setAvatarUrl: (url: string) => Promise<void>
  removeAvatar: () => Promise<void>
}

const DEFAULT_PROFILE: Omit<UserProfile, 'user_id' | 'updated_at'> = {
  avatar_url: null,
  bio: '',
  display_name: null,
  followed_users: [],
  followed_village_users: [],
  hide_userlist_main: false,
  feed_grid_columns: 1,
  hide_watch_notifications: false,
  username: null,
}

export function useProfileInternal(): UseProfileReturn {
  const { user, isLoading: isUserLoading } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (dbError) {
        // PGRST116 = no rows found — new user, return defaults
        if (dbError.code === 'PGRST116') {
          setProfile({
            ...DEFAULT_PROFILE,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          })
          return
        }
        throw new Error(dbError.message)
      }

      setProfile(data as UserProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!isUserLoading) {
      fetchProfile()
    }
  }, [user, isUserLoading, fetchProfile])

  const updateProfile = useCallback(
    async (data: { bio?: string; display_name?: string; username?: string }) => {
      if (!user) return
      setError(null)

      try {
        const { data: updated, error: dbError } = await supabase
          .from('user_data')
          .upsert({ user_id: user.id, ...data }, { onConflict: 'user_id' })
          .select('*')
          .single()

        if (dbError) {
          // Unique constraint violation on username
          if (dbError.code === '23505') {
            throw new Error('Username is already taken')
          }
          throw new Error(dbError.message)
        }

        setProfile(updated as UserProfile)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile'
        setError(message)
        throw err
      }
    },
    [user]
  )

  const updateDisplayPreferences = useCallback(
    async (data: Partial<DisplayPreferences>) => {
      if (!user) return
      setError(null)

      try {
        const { data: updated, error: dbError } = await supabase
          .from('user_data')
          .upsert({ user_id: user.id, ...data }, { onConflict: 'user_id' })
          .select('*')
          .single()

        if (dbError) throw new Error(dbError.message)

        setProfile(updated as UserProfile)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update display preferences'
        setError(message)
        throw err
      }
    },
    [user]
  )

  // Upload avatar from a local file URI (expo-image-picker).
  // Reads the file JIT as an ArrayBuffer so no base64 string sits in JS memory.
  const uploadAvatar = useCallback(async (uri: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    setError(null)

    try {
      // 1. Read file into an ArrayBuffer — temporary, GC'd after upload
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()

      // 2. Delete the previous avatar file if one exists in our bucket
      const oldUrl = profile?.avatar_url
      if (oldUrl) {
        const marker = '/object/public/avatars/'
        const markerIndex = oldUrl.indexOf(marker)
        if (markerIndex !== -1) {
          const oldPath = oldUrl.substring(markerIndex + marker.length)
          // Best-effort cleanup — don't block on failure
          await supabase.storage.from('avatars').remove([oldPath]).catch(() => {})
        }
      }

      // 3. Upload new file with a unique timestamp path
      const filePath = `${user.id}/${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw new Error(uploadError.message)

      // 4. Get public URL and persist to profile row
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Append cache-buster so RN's <Image> doesn't serve a stale cached version
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: dbError } = await supabase
        .from('user_data')
        .upsert({ user_id: user.id, avatar_url: avatarUrl }, { onConflict: 'user_id' })

      if (dbError) throw new Error(dbError.message)

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null))
      return avatarUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar'
      setError(message)
      throw err
    }
  }, [user, profile?.avatar_url])

  const setAvatarUrl = useCallback(async (url: string) => {
    if (!user) return
    setError(null)

    try {
      const { data: updated, error: dbError } = await supabase
        .from('user_data')
        .upsert({ user_id: user.id, avatar_url: url }, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (dbError) throw new Error(dbError.message)
      setProfile(updated as UserProfile)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set avatar URL'
      setError(message)
      throw err
    }
  }, [user])

  const removeAvatar = useCallback(async () => {
    if (!user) return
    setError(null)

    try {
      // Remove file(s) from storage
      const oldUrl = profile?.avatar_url
      const filesToRemove: string[] = []
      if (oldUrl) {
        const marker = '/object/public/avatars/'
        const markerIndex = oldUrl.indexOf(marker)
        if (markerIndex !== -1) {
          filesToRemove.push(oldUrl.substring(markerIndex + marker.length))
        }
      }
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove(filesToRemove)

      if (removeError) throw new Error(removeError.message)

      // Null out avatar_url in profile
      const { error: dbError } = await supabase
        .from('user_data')
        .update({ avatar_url: null })
        .eq('user_id', user.id)

      if (dbError) throw new Error(dbError.message)

      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : null))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove avatar'
      setError(message)
      throw err
    }
  }, [user, profile?.avatar_url])

  return {
    profile,
    isLoading: isLoading || isUserLoading,
    error,
    refetch: fetchProfile,
    updateProfile,
    updateDisplayPreferences,
    uploadAvatar,
    setAvatarUrl,
    removeAvatar,
  }
}
