import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase/client'
import { getClippingComments, createClippingComment, deleteClippingComment } from '@/services/clippingComments'
import { useUser } from '@/hooks/useUser'
import { useProfile } from '@/contexts/ProfileContext'
import { publishClippingCommentCount } from '@/hooks/useClippingCommentCount'
import type { ClippingComment, ClippingCommentWithAuthor } from '@/types/database'

export interface UseClippingCommentsReturn {
  comments: ClippingCommentWithAuthor[]
  isLoading: boolean
  addComment: (content: string) => Promise<void>
  removeComment: (commentId: string) => void
  refetch: () => Promise<void>
}

/**
 * Fetches comments for a Clipping (keyed by original_url), resolves author
 * info, and provides optimistic add/remove operations. Mirrors useComments.
 */
export function useClippingComments(originalUrl: string): UseClippingCommentsReturn {
  const { user } = useUser()
  const { profile } = useProfile()
  const [comments, setComments] = useState<ClippingCommentWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMounted = useRef(true)
  const countRef = useRef(0)

  useEffect(() => () => { isMounted.current = false }, [])

  useEffect(() => { countRef.current = comments.length }, [comments])

  const fetchAndResolve = useCallback(async () => {
    setIsLoading(true)
    try {
      const raw = await getClippingComments(originalUrl)
      if (!isMounted.current) return

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
  }, [originalUrl])

  useEffect(() => {
    fetchAndResolve()
  }, [fetchAndResolve])

  const addComment = useCallback(async (content: string) => {
    if (!user) throw new Error('Not signed in')

    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: ClippingCommentWithAuthor = {
      comment: {
        id: optimisticId,
        user_id: user.id,
        original_url: originalUrl,
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
    publishClippingCommentCount(originalUrl, countRef.current + 1)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    try {
      const real = await createClippingComment(originalUrl, content)
      if (isMounted.current) {
        setComments((prev) =>
          prev.map((c) => (c.comment.id === optimisticId ? { ...c, comment: real } : c)),
        )
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
      if (isMounted.current) {
        setComments((prev) => prev.filter((c) => c.comment.id !== optimisticId))
        publishClippingCommentCount(originalUrl, countRef.current - 1)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [originalUrl, user, profile])

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.comment.id !== commentId))
    publishClippingCommentCount(originalUrl, countRef.current - 1)
    deleteClippingComment(commentId).catch((error) => {
      console.error('Failed to delete comment:', error)
    })
  }, [originalUrl])

  return { comments, isLoading, addComment, removeComment, refetch: fetchAndResolve }
}
