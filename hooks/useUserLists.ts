import { useEffect, useState, useCallback, useMemo } from 'react'
import storage from '@/lib/storage'
import { supabase } from '@/lib/supabase/client'
import { useUser } from './useUser'
import type { FollowedUser } from '@/types/database'

const LOCALFORAGE_KEY = 'followed_users'

interface UseUserListsReturn {
  users: FollowedUser[]
  usernames: string[]
  isLoading: boolean
  error: string | null
  addUser: (username: string) => Promise<{ success: boolean; error?: string }>
  removeUser: (username: string) => Promise<void>
  isAuthenticated: boolean
  clearError: () => void
}

// Convert legacy string[] to FollowedUser[]
function convertToFollowedUsers(data: string[] | FollowedUser[]): FollowedUser[] {
  if (!data || data.length === 0) return []

  if (typeof data[0] === 'object' && 'username' in data[0]) {
    return data as FollowedUser[]
  }

  return (data as string[]).map((username) => ({
    username,
    added_at: new Date().toISOString(),
  }))
}

export function useUserLists(): UseUserListsReturn {
  const { user, isLoading: isAuthLoading } = useUser()
  const [users, setUsers] = useState<FollowedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!user

  useEffect(() => {
    if (isAuthLoading) return

    const loadUsers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (isAuthenticated && user) {
          const { data, error: dbError } = await supabase
            .from('user_data')
            .select('followed_users')
            .eq('user_id', user.id)
            .single()

          if (dbError) {
            // PGRST116 = no rows — new user
            if (dbError.code === 'PGRST116') {
              setUsers([])
              return
            }
            throw new Error(dbError.message)
          }

          setUsers(data?.followed_users || [])
        } else {
          await loadFromStorage()
        }
      } catch (err) {
        console.error('Error loading users:', err)
        setError('Failed to load your list')
      } finally {
        setIsLoading(false)
      }
    }

    const loadFromStorage = async () => {
      const savedUsers = await storage.getItem<string[] | FollowedUser[]>(
        LOCALFORAGE_KEY
      )
      if (savedUsers) {
        setUsers(convertToFollowedUsers(savedUsers))
      } else {
        setUsers([])
      }
    }

    loadUsers()
  }, [isAuthenticated, isAuthLoading, user])

  const addUser = useCallback(
    async (
      username: string
    ): Promise<{ success: boolean; error?: string }> => {
      const normalizedUsername = username.trim().toLowerCase()

      if (!normalizedUsername) {
        return { success: false, error: 'Username is required' }
      }

      if (users.some((u) => u.username === normalizedUsername)) {
        return { success: false, error: 'User already in list' }
      }

      setError(null)

      try {
        if (isAuthenticated && user) {
          // Validate the Letterboxd user exists by checking their RSS
          try {
            const rssCheck = await fetch(
              `https://letterboxd.com/${normalizedUsername}/rss/`,
              { method: 'HEAD' }
            )
            if (!rssCheck.ok) {
              return { success: false, error: 'Letterboxd user not found' }
            }
          } catch {
            return { success: false, error: 'CONNECTION_ERROR' }
          }

          const newUser: FollowedUser = {
            username: normalizedUsername,
            added_at: new Date().toISOString(),
          }
          const updatedUsers = [...users, newUser]

          const { error: dbError } = await supabase
            .from('user_data')
            .upsert(
              { user_id: user.id, followed_users: updatedUsers },
              { onConflict: 'user_id' }
            )

          if (dbError) throw new Error(dbError.message)

          setUsers(updatedUsers)
          return { success: true }
        } else {
          // Guest mode — save to AsyncStorage
          const newUser: FollowedUser = {
            username: normalizedUsername,
            added_at: new Date().toISOString(),
          }

          const updatedUsers = [...users, newUser]
          setUsers(updatedUsers)

          await storage.setItem(
            LOCALFORAGE_KEY,
            updatedUsers.map((u) => u.username)
          )

          return { success: true }
        }
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('fetch')) {
          return { success: false, error: 'CONNECTION_ERROR' }
        }
        return { success: false, error: 'CONNECTION_ERROR' }
      }
    },
    [isAuthenticated, users, user]
  )

  const removeUser = useCallback(
    async (username: string): Promise<void> => {
      const normalizedUsername = username.trim().toLowerCase()
      setError(null)

      try {
        if (isAuthenticated && user) {
          const updatedUsers = users.filter(
            (u) => u.username !== normalizedUsername
          )

          const { error: dbError } = await supabase
            .from('user_data')
            .update({ followed_users: updatedUsers })
            .eq('user_id', user.id)

          if (dbError) throw new Error(dbError.message)

          setUsers(updatedUsers)
        } else {
          const updatedUsers = users.filter(
            (u) => u.username !== normalizedUsername
          )
          setUsers(updatedUsers)

          await storage.setItem(
            LOCALFORAGE_KEY,
            updatedUsers.map((u) => u.username)
          )
        }
      } catch (err) {
        console.error('Error removing user:', err)
        setError('Failed to remove user')
      }
    },
    [isAuthenticated, users, user]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const usernames = useMemo(() => users.map((u) => u.username), [users])

  return {
    users,
    usernames,
    isLoading: isLoading || isAuthLoading,
    error,
    addUser,
    removeUser,
    isAuthenticated,
    clearError,
  }
}
