// components/dashboard/Sidebar.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext' // Import the auth context

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface SidebarItem {
  name: string;
  path: string;
  icon: string;
  requiredRole?: 'admin' | 'manager' | 'lead' | 'staff';
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
  requiredRole?: 'admin' | 'manager' | 'lead' | 'staff';
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  // Use the auth context instead of mock data
  const { user, isAdmin, isManager, isLead, logout } = useAuth()
  
  // Get current path
  const [pathname, setPathname] = useState<string>('/')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
    }
  }, [])
  
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  
  // Navigation items grouped by category
  const sidebarGroups: SidebarGroup[] = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", path: "/dashboard", icon: "📊" },
        { name: "Tasks", path: "/tasks", icon: "✓" },
        { name: "Announcements", path: "/announcements", icon: "📢" },
      ]
    },
    {
      title: "Customers",
      items: [
        { name: "Pre-Orders", path: "/preorders", icon: "🛒" },
        { name: "Customer Complaints", path: "/complaints", icon: "🔔" },
      ]
    },
    {
      title: "Inventory & Equipment",
      items: [
        { name: "Inventory", path: "/inventory", icon: "📦", requiredRole: "lead" },
        { name: "Equipment", path: "/equipment", icon: "🔧" },
        { name: "Temperature", path: "/temperature", icon: "🌡️" },
      ]
    },
    {
      title: "Personnel",
      items: [
        { name: "Employees", path: "/employees", icon: "👥", requiredRole: "manager" },
        { name: "Departments", path: "/departments", icon: "🏢", requiredRole: "manager" },
        { name: "Training", path: "/training", icon: "📚", requiredRole: "lead" },
      ]
    },
    {
      title: "Administration",
      items: [
        { name: "Users", path: "/users", icon: "👤", requiredRole: "admin" },
        { name: "Permissions", path: "/permissions", icon: "🔐", requiredRole: "admin" },
      ],
      requiredRole: "admin"
    }
  ]
  
  // Handle window resize
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth < 1024) {
          setSidebarOpen(false)
        } else {
          setSidebarOpen(true)
        }
      }
      
      window.addEventListener('resize', handleResize)
      handleResize()
      
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Filter items based on user role
  const filteredGroups = sidebarGroups
    .filter(group => !group.requiredRole || 
      (group.requiredRole === 'admin' && isAdmin) || 
      (group.requiredRole === 'manager' && isManager) ||
      (group.requiredRole === 'lead' && isLead))
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.requiredRole || 
        (item.requiredRole === 'admin' && isAdmin) || 
        (item.requiredRole === 'manager' && isManager) ||
        (item.requiredRole === 'lead' && isLead))
    }))
    .filter(group => group.items.length > 0)
  
  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-dark-900/50 z-20 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`bg-dark-900 text-cream-100 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      } transition-all duration-300 fixed lg:relative z-30 h-screen ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute right-[-12px] top-20 bg-accent-blue rounded-full w-6 h-6 items-center justify-center 
            shadow-md z-10 border-none cursor-pointer hidden lg:flex"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
        
        {/* Logo area */}
        <div className="p-6 border-b border-dark-600 flex-shrink-0">
          <div className="flex items-center">
            <div className="bg-gold w-10 h-10 rounded-lg flex items-center justify-center text-dark-900 font-bold text-xl">
              SM
            </div>
            {sidebarOpen && (
              <h1 className="ml-3 text-xl font-semibold text-cream-100 whitespace-nowrap overflow-hidden">
                Store Management
              </h1>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-6">
              {sidebarOpen && (
                <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-cream-300 mb-2">
                  {group.title}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <a 
                      href={item.path}
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors text-cream-200 
                        ${pathname === item.path ? 'bg-dark-600 text-cream-50' : 'hover:bg-dark-700 hover:text-cream-100'}`}
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setMobileMenuOpen(false)
                        }
                      }}
                    >
                      <span className="inline-flex items-center justify-center h-6 w-6 text-lg">{item.icon}</span>
                      {sidebarOpen && <span className="ml-3 whitespace-nowrap overflow-hidden">{item.name}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* User profile area */}
        <div className="p-4 border-t border-dark-600">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium flex-shrink-0 ${
              user?.role === 'admin' 
                ? 'bg-accent-red/20 text-accent-red' 
                : user?.role === 'manager' 
                ? 'bg-gold/20 text-gold' 
                : user?.role === 'lead'
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'bg-accent-green/20 text-accent-green'
            }`}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            {sidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-cream-100 truncate">{user?.username || 'User'}</p>
                <div className="flex items-center text-xs">
                  <span className="text-cream-300">{user?.role || 'Staff'}</span>
                  {user?.department_id && (
                    <>
                      <span className="mx-1 text-cream-500">•</span>
                      <span className="text-cream-300">Dept {user.department_id}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="ml-auto text-cream-300 bg-transparent border-none cursor-pointer p-2 transition-colors hover:text-cream-100"
              aria-label="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}