import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import storage from '@/lib/storage'
import { supabase } from '@/lib/supabase/client'
import { fetchDisplayName } from '@/services/feed'
import { useUser } from '@/hooks/useUser'
import type { FollowedUser } from '@/types/database'

const LOCALFORAGE_KEY = 'followed_users'

interface UserListsState {
  users: FollowedUser[]
  usernames: string[]
  isLoading: boolean
  error: string | null
  addUser: (username: string) => Promise<{ success: boolean; error?: string }>
  removeUser: (username: string) => Promise<void>
  isAuthenticated: boolean
  clearError: () => void
}

const UserListsContext = createContext<UserListsState | null>(null)

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

export function UserListsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser()
  const [users, setUsers] = useState<FollowedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const backfillRan = useRef(false)

  const isAuthenticated = !!user

  // Load users on mount / auth change
  useEffect(() => {
    if (isAuthLoading) return
    backfillRan.current = false

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
            if (dbError.code === 'PGRST116') {
              setUsers([])
              return
            }
            throw new Error(dbError.message)
          }

          setUsers(data?.followed_users || [])
        } else {
          const savedUsers = await storage.getItem<string[] | FollowedUser[]>(
            LOCALFORAGE_KEY
          )
          if (savedUsers) {
            setUsers(convertToFollowedUsers(savedUsers))
          } else {
            setUsers([])
          }
        }
      } catch (err) {
        console.error('Error loading users:', err)
        setError('Failed to load your list')
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [isAuthenticated, isAuthLoading, user])

  // Backfill display names
  useEffect(() => {
    if (isLoading || users.length === 0 || backfillRan.current) return

    const needsBackfill = users.filter((u) => !u.display_name)
    if (needsBackfill.length === 0) return

    backfillRan.current = true

    const run = async () => {
      const names = await Promise.all(
        needsBackfill.map((u) => fetchDisplayName(u.username))
      )

      const nameMap = new Map<string, string>()
      needsBackfill.forEach((u, i) => {
        if (names[i]) nameMap.set(u.username, names[i]!)
      })

      if (nameMap.size === 0) return

      const updated = users.map((u) =>
        nameMap.has(u.username) ? { ...u, display_name: nameMap.get(u.username) } : u
      )

      setUsers(updated)

      if (isAuthenticated && user) {
        const { error: dbError } = await supabase
          .from('user_data')
          .update({ followed_users: updated })
          .eq('user_id', user.id)
        if (dbError) console.error('Failed to persist display names:', dbError.message)
      } else {
        await storage.setItem(LOCALFORAGE_KEY, updated)
      }
    }

    run()
  }, [isLoading, users, isAuthenticated, user])

  // Optimistic add — update UI immediately, then persist in background
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
        // Validate the user exists on Letterboxd first (can't optimistically skip this)
        let displayName: string | undefined
        try {
          displayName = await fetchDisplayName(normalizedUsername)
          if (displayName === undefined) {
            return { success: false, error: 'Letterboxd user not found' }
          }
        } catch {
          return { success: false, error: 'CONNECTION_ERROR' }
        }

        const newUser: FollowedUser = {
          username: normalizedUsername,
          display_name: displayName,
          added_at: new Date().toISOString(),
        }
        const updatedUsers = [...users, newUser]

        // Optimistic update — show the new user immediately
        setUsers(updatedUsers)

        // Persist in the background
        try {
          if (isAuthenticated && user) {
            const { error: dbError } = await supabase
              .from('user_data')
              .upsert(
                { user_id: user.id, followed_users: updatedUsers },
                { onConflict: 'user_id' }
              )
            if (dbError) throw new Error(dbError.message)
          } else {
            await storage.setItem(LOCALFORAGE_KEY, updatedUsers)
          }
        } catch (persistErr) {
          // Revert optimistic update on failure
          console.error('Failed to persist add:', persistErr)
          setUsers(users)
          return { success: false, error: 'Failed to save — please try again' }
        }

        return { success: true }
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('fetch')) {
          return { success: false, error: 'CONNECTION_ERROR' }
        }
        return { success: false, error: 'CONNECTION_ERROR' }
      }
    },
    [isAuthenticated, users, user]
  )

  // Optimistic remove — update UI immediately, then persist in background
  const removeUser = useCallback(
    async (username: string): Promise<void> => {
      const normalizedUsername = username.trim().toLowerCase()
      setError(null)

      const previousUsers = users
      const updatedUsers = users.filter(
        (u) => u.username !== normalizedUsername
      )

      // Optimistic update — remove from UI immediately
      setUsers(updatedUsers)

      try {
        if (isAuthenticated && user) {
          const { error: dbError } = await supabase
            .from('user_data')
            .update({ followed_users: updatedUsers })
            .eq('user_id', user.id)

          if (dbError) throw new Error(dbError.message)
        } else {
          await storage.setItem(LOCALFORAGE_KEY, updatedUsers)
        }
      } catch (err) {
        // Revert optimistic update on failure
        console.error('Error removing user:', err)
        setUsers(previousUsers)
        setError('Failed to remove user')
      }
    },
    [isAuthenticated, users, user]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const usernames = useMemo(() => users.map((u) => u.username), [users])

  const value = useMemo(
    () => ({
      users,
      usernames,
      isLoading: isLoading || isAuthLoading,
      error,
      addUser,
      removeUser,
      isAuthenticated,
      clearError,
    }),
    [users, usernames, isLoading, isAuthLoading, error, addUser, removeUser, isAuthenticated, clearError]
  )

  return (
    <UserListsContext.Provider value={value}>
      {children}
    </UserListsContext.Provider>
  )
}

export function useUserListsContext(): UserListsState {
  const ctx = useContext(UserListsContext)
  if (!ctx) {
    throw new Error('useUserListsContext must be used within a UserListsProvider')
  }
  return ctx
}
