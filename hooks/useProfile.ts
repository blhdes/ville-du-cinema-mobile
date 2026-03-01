import { useEffect, useState, useCallback } from 'react'
import { useUser } from './useUser'
import { supabase } from '@/lib/supabase/client'
import type { UserProfile, DisplayPreferences } from '@/types/database'

interface UseProfileReturn {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
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
  language: 'fr',
  hide_userlist_main: false,
  feed_grid_columns: 1,
  hide_watch_notifications: false,
  username: null,
}

export function useProfile(): UseProfileReturn {
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

  // Upload avatar from a local file URI (React Native)
  const uploadAvatar = useCallback(async (uri: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    setError(null)

    try {
      const ext = uri.split('.').pop() || 'jpg'
      const fileName = `${user.id}/avatar.${ext}`

      // Read file as blob for upload
      const response = await fetch(uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const avatarUrl = urlData.publicUrl

      // Update profile with new avatar URL
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
  }, [user])

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
      // Remove file from storage
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`])

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
  }, [user])

  return {
    profile,
    isLoading: isLoading || isUserLoading,
    error,
    updateProfile,
    updateDisplayPreferences,
    uploadAvatar,
    setAvatarUrl,
    removeAvatar,
  }
}
