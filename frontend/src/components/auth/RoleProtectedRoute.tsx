// components/auth/RoleProtectedRoute.tsx

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface RoleProtectedRouteProps {
  children: React.ReactNode
}

export default function RoleProtectedRoute({ children }: RoleProtectedRouteProps) {
  const { user, loading, canAccessRoute } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      // First check if user is logged in
      if (!user) {
        router.push('/login')
        return
      }
      
      // Then check if user has permission to access this route
      if (!canAccessRoute(pathname)) {
        router.push('/dashboard')
      }
    }
  }, [loading, user, pathname, router, canAccessRoute])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dark-900"></div>
      </div>
    )
  }

  // If not loading and canAccessRoute didn't redirect, render children
  return <>{children}</>
}