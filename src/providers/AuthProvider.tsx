'use client'

import { createContext, useContext } from 'react'
import type { UserData } from '@/types/shared'

interface AuthContextValue {
  user: UserData | null
}

const AuthContext = createContext<AuthContextValue>({ user: null })

/** 인증 사용자 정보 Provider (서버에서 주입) */
export function AuthProvider({
  user,
  children,
}: {
  user: UserData | null
  children: React.ReactNode
}) {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

/** 현재 인증된 사용자 정보를 반환하는 훅 */
export function useAuth() {
  const context = useContext(AuthContext)
  return context
}
