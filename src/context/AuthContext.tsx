import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../features/auth/authApi'
import type { AuthenticatedUser, RegistrationInput, SignInInput } from '../features/auth/types'

type BusinessBrandInput = { name: string; logoUrl?: string }

interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isRestoring: boolean
  signIn: (input: SignInInput) => Promise<void>
  register: (input: RegistrationInput) => Promise<void>
  updateBusinessBrand: (input: BusinessBrandInput) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const isPublicAuthRoute = location.pathname === '/sign-in' || location.pathname === '/register-business'

  const applySession = useCallback((session: Awaited<ReturnType<typeof authApi.signIn>>) => {
    if (session.stores) {
      queryClient.setQueryData(['stores', { businessId: session.user.business.id }], session.stores)
    }
    setUser(session.user)
  }, [queryClient])

  useEffect(() => {
    let mounted = true
    if (user || isPublicAuthRoute) {
      setIsRestoring(false)
      return () => { mounted = false }
    }

    setIsRestoring(true)
    authApi.restore().then((session) => {
      if (mounted && session) applySession(session)
    }).finally(() => {
      if (mounted) setIsRestoring(false)
    })
    return () => { mounted = false }
  }, [applySession, isPublicAuthRoute, user])

  const signIn = useCallback(async (input: SignInInput) => {
    applySession(await authApi.signIn(input))
  }, [applySession])

  const register = useCallback(async (input: RegistrationInput) => {
    applySession(await authApi.register(input))
  }, [applySession])

  const updateBusinessBrand = useCallback(async (input: BusinessBrandInput) => {
    if (!user) return
    const business = await authApi.updateBusiness({
      businessId: user.business.id,
      name: input.name,
      logoUrl: input.logoUrl,
    })
    setUser({ ...user, business })
  }, [user])

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut()
    } finally {
      queryClient.removeQueries({ queryKey: ['stores'] })
      setUser(null)
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isRestoring,
    signIn,
    register,
    updateBusinessBrand,
    signOut,
  }), [user, isRestoring, signIn, register, updateBusinessBrand, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider.')
  return context
}
