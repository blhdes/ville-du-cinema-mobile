import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase/client'
import { getComments, createComment, deleteComment } from '@/services/comments'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/contexts/ProfileContext'
import { publishCommentCount } from '@/hooks/useCommentCount'
import type { TakeComment, TakeCommentWithAuthor } from '@/types/database'

export interface UseCommentsReturn {
  comments: TakeCommentWithAuthor[]
  isLoading: boolean
  addComment: (content: string) => Promise<void>
  removeComment: (commentId: string) => void
  refetch: () => Promise<void>
}

/**
 * Fetches comments for a Take, resolves author info, and provides
 * optimistic add/remove operations.
 */
export function useComments(takeId: string): UseCommentsReturn {
  const { user } = useUser()
  const { profile } = useProfile()
  const [comments, setComments] = useState<TakeCommentWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)
  const countRef = useRef(0)

  useEffect(() => () => { isMounted.current = false }, [])

  // Keep countRef in sync so addComment/removeComment can publish without
  // reading count inside a state updater (which would cause setState-in-render)
  useEffect(() => { countRef.current = comments.length }, [comments])

  const fetchAndResolve = useCallback(async () => {
    setIsLoading(true)
    try {
      const raw = await getComments(takeId)
      if (!isMounted.current) return

      // Batch-resolve author info
      const userIds = [...new Set(raw.map((c) => c.user_id))]
      const authorMap = new Map<string, { displayName: string; avatarUrl: string | undefined; username: string | undefined }>()

      if (userIds.length > 0) {
        const { data } = await supabase
          .from('user_data')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', userIds)

        for (const row of data ?? []) {
          authorMap.set(row.user_id, {
            displayName: row.display_name ?? row.username ?? 'Village User',
            avatarUrl: row.avatar_url ?? undefined,
            username: row.username ?? undefined,
          })
        }
      }

      if (!isMounted.current) return
      setComments(
        raw.map((c) => ({
          comment: c,
          author: {
            userId: c.user_id,
            displayName: authorMap.get(c.user_id)?.displayName ?? 'Village User',
            avatarUrl: authorMap.get(c.user_id)?.avatarUrl,
            username: authorMap.get(c.user_id)?.username,
          },
        })),
      )
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [takeId])

  useEffect(() => {
    fetchAndResolve()
  }, [fetchAndResolve])

  const addComment = useCallback(async (content: string) => {
    if (!user) throw new Error('Not signed in')

    // Optimistic insert at the end
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: TakeCommentWithAuthor = {
      comment: {
        id: optimisticId,
        user_id: user.id,
        take_id: takeId,
        content,
        created_at: new Date().toISOString(),
      },
      author: {
        userId: user.id,
        displayName: profile?.display_name ?? profile?.username ?? 'You',
        avatarUrl: profile?.avatar_url ?? undefined,
        username: profile?.username ?? undefined,
      },
    }

    setComments((prev) => [...prev, optimistic])
    publishCommentCount(takeId, countRef.current + 1)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    try {
      const real = await createComment(takeId, content)
      // Replace optimistic entry with the real one
      if (isMounted.current) {
        setComments((prev) =>
          prev.map((c) => (c.comment.id === optimisticId ? { ...c, comment: real } : c)),
        )
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
      // Roll back
      if (isMounted.current) {
        setComments((prev) => prev.filter((c) => c.comment.id !== optimisticId))
        publishCommentCount(takeId, countRef.current - 1)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [takeId, user, profile])

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.comment.id !== commentId))
    publishCommentCount(takeId, countRef.current - 1)
    deleteComment(commentId).catch((error) => {
      console.error('Failed to delete comment:', error)
    })
  }, [takeId])

  return { comments, isLoading, addComment, removeComment, refetch: fetchAndResolve }
}
