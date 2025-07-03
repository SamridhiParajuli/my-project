// app/(dashboard)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </AuthProvider>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, canAccessRoute } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated
      if (!user) {
        router.push('/login')
        return
      }
      
      // Check if user has permission to access current route
      if (pathname && !canAccessRoute(pathname)) {
        router.push('/dashboard')
      }
    }
  }, [user, loading, pathname, router, canAccessRoute])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dark-900"></div>
      </div>
    )
  }

  const getPageTitle = () => {
    if (!pathname) return 'Store Management';
    
    switch (pathname) {
      case '/dashboard': return 'Dashboard'
      case '/tasks': return 'Tasks'
      case '/preorders': return 'Pre-Orders'
      case '/complaints': return 'Customer Complaints'
      case '/announcements': return 'Announcements'
      case '/inventory': return 'Inventory'
      case '/temperature': return 'Temperature Monitoring'
      case '/equipment': return 'Equipment'
      case '/employees': return 'Employees'
      case '/departments': return 'Departments'
      case '/training': return 'Training'
      case '/users': return 'Users'
      case '/permissions': return 'Permissions'
      default: return 'Store Management'
    }
  }

  return (
    <div className="flex min-h-screen bg-cream-50">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-dark-900/50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col w-full bg-cream-50 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-white border-b border-cream-200 shadow-sm z-10">
          <div className="flex justify-between items-center px-6 py-4">
            {/* Mobile menu button */}
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-dark-800 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            
            <h1 className="text-2xl font-semibold text-dark-800">
              {getPageTitle()}
            </h1>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  user.role === 'admin' 
                    ? 'bg-accent-red' 
                    : user.role === 'manager' 
                    ? 'bg-gold' 
                    : 'bg-accent-green'
                }`}></span>
                <span className="text-sm font-medium">{user.role}</span>
              </div>
              <div className="bg-cream-100 text-dark-700 px-4 py-1 rounded-full text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-cream-50">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}