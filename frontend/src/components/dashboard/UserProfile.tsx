'use client'

import { User } from '@/contexts/AuthContext'

interface UserProfileProps {
  user: User | null
  onLogout: () => void
  showFullProfile: boolean
}

const UserProfile = ({ user, onLogout, showFullProfile }: UserProfileProps) => {
  if (!user) return null

  return (
    <div className="p-4 border-t border-dark-600">
      <div className="flex items-center">
        <div className="bg-accent-red/20 text-accent-red w-10 h-10 rounded-full flex items-center justify-center font-medium flex-shrink-0">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>
        {showFullProfile && (
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-cream-100 truncate">{user?.username || 'User'}</p>
            <p className="text-xs text-cream-300">{user?.role || 'Staff'}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="ml-auto text-cream-300 bg-transparent border-none cursor-pointer p-2 transition-colors hover:text-cream-100"
          title="Logout"
          aria-label="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </div>
  )
}

export default UserProfile