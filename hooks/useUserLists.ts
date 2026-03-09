import { useUserListsContext } from '@/contexts/UserListsProvider'
import type { FollowedUser } from '@/types/database'

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

/**
 * Thin wrapper — all state lives in UserListsProvider so every
 * consumer (FeedScreen, Drawer, ProfileScreen) shares the same data.
 */
export function useUserLists(): UseUserListsReturn {
  return useUserListsContext()
}
