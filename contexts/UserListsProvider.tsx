import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import storage from '@/lib/storage'
import { supabase } from '@/lib/supabase/client'
import { fetchDisplayName, refreshAvatarUrls } from '@/services/feed'
import { useUser } from '@/hooks/useUser'
import type { FollowedUser, FollowedVillageUser } from '@/types/database'

const LOCALFORAGE_KEY = 'followed_users'
const VILLAGE_LOCALFORAGE_KEY = 'followed_village_users'

interface UserListsState {
  // Letterboxd
  users: FollowedUser[]
  usernames: string[]
  addUser: (username: string) => Promise<{ success: boolean; error?: string }>
  removeUser: (username: string) => Promise<void>
  // Village
  villageUsers: FollowedVillageUser[]
  villageUserIds: string[]
  addVillageUser: (user: FollowedVillageUser) => Promise<{ success: boolean; error?: string }>
  removeVillageUser: (userId: string) => Promise<void>
  // Shared
  isLoading: boolean
  error: string | null
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
  const [villageUsers, setVillageUsers] = useState<FollowedVillageUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const backfillRan = useRef(false)

  const isAuthenticated = !!user

  // Load both Letterboxd and Village follows on mount / auth change
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
            .select('followed_users, followed_village_users')
            .eq('user_id', user.id)
            .single()

          if (dbError) {
            if (dbError.code === 'PGRST116') {
              setUsers([])
              setVillageUsers([])
              return
            }
            throw new Error(dbError.message)
          }

          setUsers(data?.followed_users || [])
          setVillageUsers(data?.followed_village_users || [])
        } else {
          const savedUsers = await storage.getItem<string[] | FollowedUser[]>(LOCALFORAGE_KEY)
          if (savedUsers) {
            setUsers(convertToFollowedUsers(savedUsers))
          } else {
            setUsers([])
          }

          const savedVillageUsers = await storage.getItem<FollowedVillageUser[]>(VILLAGE_LOCALFORAGE_KEY)
          setVillageUsers(savedVillageUsers || [])
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

  // Backfill Letterboxd display names (not needed for Village users — snapshot is stored inline)
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

  // Optimistic add (Letterboxd) — validate on Letterboxd first, then persist
  const addUser = useCallback(
    async (username: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedUsername = username.trim().toLowerCase()

      if (!normalizedUsername) {
        return { success: false, error: 'Username is required' }
      }

      if (users.some((u) => u.username === normalizedUsername)) {
        return { success: false, error: 'User already in list' }
      }

      setError(null)

      try {
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

        setUsers(updatedUsers)
        refreshAvatarUrls([normalizedUsername]).catch(() => {})

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

  // Optimistic remove (Letterboxd)
  const removeUser = useCallback(
    async (username: string): Promise<void> => {
      const normalizedUsername = username.trim().toLowerCase()
      setError(null)

      const previousUsers = users
      const updatedUsers = users.filter((u) => u.username !== normalizedUsername)

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
        console.error('Error removing user:', err)
        setUsers(previousUsers)
        setError('Failed to remove user')
      }
    },
    [isAuthenticated, users, user]
  )

  // Optimistic add (Village) — caller provides the full profile snapshot
  const addVillageUser = useCallback(
    async (newUser: FollowedVillageUser): Promise<{ success: boolean; error?: string }> => {
      if (villageUsers.some((u) => u.user_id === newUser.user_id)) {
        return { success: false, error: 'Already following this user' }
      }

      setError(null)
      const updatedVillageUsers = [...villageUsers, newUser]
      setVillageUsers(updatedVillageUsers)

      try {
        if (isAuthenticated && user) {
          const { error: dbError } = await supabase
            .from('user_data')
            .update({ followed_village_users: updatedVillageUsers })
            .eq('user_id', user.id)
          if (dbError) throw new Error(dbError.message)
        } else {
          await storage.setItem(VILLAGE_LOCALFORAGE_KEY, updatedVillageUsers)
        }
      } catch (persistErr) {
        console.error('Failed to persist village follow:', persistErr)
        setVillageUsers(villageUsers)
        return { success: false, error: 'Failed to save — please try again' }
      }

      return { success: true }
    },
    [isAuthenticated, villageUsers, user]
  )

  // Optimistic remove (Village)
  const removeVillageUser = useCallback(
    async (userId: string): Promise<void> => {
      setError(null)
      const previousVillageUsers = villageUsers
      const updatedVillageUsers = villageUsers.filter((u) => u.user_id !== userId)

      setVillageUsers(updatedVillageUsers)

      try {
        if (isAuthenticated && user) {
          const { error: dbError } = await supabase
            .from('user_data')
            .update({ followed_village_users: updatedVillageUsers })
            .eq('user_id', user.id)
          if (dbError) throw new Error(dbError.message)
        } else {
          await storage.setItem(VILLAGE_LOCALFORAGE_KEY, updatedVillageUsers)
        }
      } catch (err) {
        console.error('Error removing village user:', err)
        setVillageUsers(previousVillageUsers)
        setError('Failed to remove user')
      }
    },
    [isAuthenticated, villageUsers, user]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const usernames = useMemo(() => users.map((u) => u.username), [users])
  const villageUserIds = useMemo(() => villageUsers.map((u) => u.user_id), [villageUsers])

  const value = useMemo(
    () => ({
      users,
      usernames,
      addUser,
      removeUser,
      villageUsers,
      villageUserIds,
      addVillageUser,
      removeVillageUser,
      isLoading: isLoading || isAuthLoading,
      error,
      isAuthenticated,
      clearError,
    }),
    [
      users, usernames, addUser, removeUser,
      villageUsers, villageUserIds, addVillageUser, removeVillageUser,
      isLoading, isAuthLoading, error, isAuthenticated, clearError,
    ]
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
