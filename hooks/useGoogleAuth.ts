import { useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase/client'

// Required on iOS: dismisses the Safari auth browser after the redirect lands
WebBrowser.maybeCompleteAuthSession()

const REDIRECT_URL = 'villeducinema://auth/callback'

interface GoogleAuthState {
  signIn: () => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export function useGoogleAuth(): GoogleAuthState {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setError(null)
    setIsLoading(true)

    try {
      // Step 1: Get the OAuth URL from Supabase without opening a browser yet
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      })

      if (oauthError || !data.url) {
        setError('Could not start sign-in. Please try again.')
        return
      }

      // Step 2: Open a controlled browser tab and wait for the redirect
      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL)

      if (result.type !== 'success') {
        // User cancelled or the browser closed without redirecting — not an error
        return
      }

      // Step 3: Exchange the one-time code in the redirect URL for a real session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)

      if (sessionError) {
        console.error('[useGoogleAuth] exchangeCodeForSession failed:', sessionError)
        setError('Sign-in failed. Please try again.')
      }
      // On success, onAuthStateChange in useUser picks up the new session automatically
    } catch (err) {
      console.error('[useGoogleAuth] unexpected error:', err)
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return { signIn, isLoading, error, clearError: () => setError(null) }
}
