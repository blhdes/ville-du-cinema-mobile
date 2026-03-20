import { useCallback, useEffect, useState } from 'react'
import { useUser } from './useUser'
import { getUserClippings } from '@/services/clippings'
import type { Clipping } from '@/types/database'

export interface UseClippingsReturn {
  clippings: Clipping[]
  isLoading: boolean
  refetch: () => Promise<void>
  /** Optimistically remove a clipping from local state after deletion. */
  removeClipping: (id: string) => void
}

export function useClippings(): UseClippingsReturn {
  const { user, isLoading: isUserLoading } = useUser()
  const [clippings, setClippings] = useState<Clipping[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchClippings = useCallback(async () => {
    if (!user) {
      setClippings([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await getUserClippings(user.id)
      setClippings(data)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isUserLoading) return
    fetchClippings()
  }, [fetchClippings, isUserLoading])

  const removeClipping = useCallback((id: string) => {
    setClippings((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { clippings, isLoading, refetch: fetchClippings, removeClipping }
}
