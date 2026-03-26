import { useCallback, useEffect, useState } from 'react'
import { useUser } from './useUser'
import { getUserTakes } from '@/services/takes'
import type { Take } from '@/types/database'

export interface UseTakesReturn {
  takes: Take[]
  isLoading: boolean
  refetch: () => Promise<void>
  /** Optimistically remove a take from local state after deletion. */
  removeTake: (id: string) => void
}

export function useTakes(): UseTakesReturn {
  const { user, isLoading: isUserLoading } = useUser()
  const [takes, setTakes] = useState<Take[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTakes = useCallback(async () => {
    if (!user) {
      setTakes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getUserTakes(user.id)
      setTakes(data)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isUserLoading) return
    fetchTakes()
  }, [fetchTakes, isUserLoading])

  const removeTake = useCallback((id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { takes, isLoading, refetch: fetchTakes, removeTake }
}
