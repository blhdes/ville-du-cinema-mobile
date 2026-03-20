import { useUserListsContext } from '@/contexts/UserListsProvider'
import type { FollowedUser, FollowedVillageUser } from '@/types/database'

interface UseUserListsReturn {
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

/**
 * Thin wrapper — all state lives in UserListsProvider so every
 * consumer (FeedScreen, Drawer, ProfileScreen) shares the same data.
 */
export function useUserLists(): UseUserListsReturn {
  return useUserListsContext()
}
