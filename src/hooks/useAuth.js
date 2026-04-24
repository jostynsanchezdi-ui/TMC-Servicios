import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { ...context, signIn, signOut }
}
