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
  addComment: (content: string, parentCommentId?: string) => Promise<void>
  removeComment: (commentId: string) => void
  refetch: () => Promise<void>
}

/** Total comments including replies — what the comment-count badge shows. */
function countAll(comments: TakeCommentWithAuthor[]): number {
  return comments.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)
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
  useEffect(() => { countRef.current = countAll(comments) }, [comments])

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

      const toEntry = (c: TakeComment): TakeCommentWithAuthor => ({
        comment: c,
        author: {
          userId: c.user_id,
          displayName: authorMap.get(c.user_id)?.displayName ?? 'Village User',
          avatarUrl: authorMap.get(c.user_id)?.avatarUrl,
          username: authorMap.get(c.user_id)?.username,
        },
      })

      // Nest replies one level under their parent — raw is already
      // created_at-ascending, so replies stay in post order within each parent.
      const topLevel = raw.filter((c) => !c.parent_comment_id).map(toEntry)
      for (const reply of raw.filter((c) => c.parent_comment_id)) {
        const parent = topLevel.find((t) => t.comment.id === reply.parent_comment_id)
        if (!parent) continue // parent not found (e.g. deleted) — drop the orphaned reply
        parent.replies = [...(parent.replies ?? []), toEntry(reply)]
      }

      setComments(topLevel)
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [takeId])

  useEffect(() => {
    fetchAndResolve()
  }, [fetchAndResolve])

  const addComment = useCallback(async (content: string, parentCommentId?: string) => {
    if (!user) throw new Error('Not signed in')

    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: TakeCommentWithAuthor = {
      comment: {
        id: optimisticId,
        user_id: user.id,
        take_id: takeId,
        content,
        created_at: new Date().toISOString(),
        parent_comment_id: parentCommentId ?? null,
      },
      author: {
        userId: user.id,
        displayName: profile?.display_name ?? profile?.username ?? 'You',
        avatarUrl: profile?.avatar_url ?? undefined,
        username: profile?.username ?? undefined,
      },
    }

    // Optimistic insert — new top-level comment at the end, or a reply
    // appended under its parent.
    setComments((prev) =>
      parentCommentId
        ? prev.map((c) => c.comment.id === parentCommentId
            ? { ...c, replies: [...(c.replies ?? []), optimistic] }
            : c)
        : [...prev, optimistic],
    )
    publishCommentCount(takeId, countRef.current + 1)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    const replaceOptimistic = (prev: TakeCommentWithAuthor[]): TakeCommentWithAuthor[] =>
      prev.map((c) => {
        if (c.comment.id === optimisticId) return { ...c, comment: real }
        if (c.replies?.some((r) => r.comment.id === optimisticId)) {
          return { ...c, replies: c.replies.map((r) => (r.comment.id === optimisticId ? { ...r, comment: real } : r)) }
        }
        return c
      })

    const removeOptimistic = (prev: TakeCommentWithAuthor[]): TakeCommentWithAuthor[] =>
      prev
        .filter((c) => c.comment.id !== optimisticId)
        .map((c) => (c.replies ? { ...c, replies: c.replies.filter((r) => r.comment.id !== optimisticId) } : c))

    let real: TakeComment
    try {
      real = await createComment(takeId, content, parentCommentId)
      if (isMounted.current) setComments(replaceOptimistic)
    } catch (error) {
      console.error('Failed to post comment:', error)
      if (isMounted.current) {
        setComments(removeOptimistic)
        publishCommentCount(takeId, countRef.current - 1)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [takeId, user, profile])

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) =>
      prev
        .filter((c) => c.comment.id !== commentId)
        .map((c) => (c.replies ? { ...c, replies: c.replies.filter((r) => r.comment.id !== commentId) } : c)),
    )
    publishCommentCount(takeId, countRef.current - 1)
    deleteComment(commentId).catch((error) => {
      console.error('Failed to delete comment:', error)
    })
  }, [takeId])

  return { comments, isLoading, addComment, removeComment, refetch: fetchAndResolve }
}
