// Path: src/components/dashboard/UserProfile.tsx
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react';

interface UserProfileProps {
  className?: string;
}

const UserProfile = ({ className }: UserProfileProps) => {
  const { user, employee } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!user) {
    return null;
  }

  // Get display name with fallbacks
  const getDisplayName = () => {
    // First try to use employee name if available
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    
    // Then try user properties
    if (user.name) {
      return user.name;
    }
    
    // Fall back to username
    return user.username;
  };

  // Get initial for avatar
  const getInitial = () => {
    if (employee && employee.first_name) {
      return employee.first_name.charAt(0);
    }
    
    if (user.name) {
      return user.name.charAt(0);
    }
    
    return user.username.charAt(0);
  };

  const displayName = getDisplayName();
  const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-md bg-primary-light hover:bg-primary transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-primary-dark uppercase font-bold">
          {getInitial()}
        </div>
        
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-secondary truncate">
            {displayName}
          </p>
          <p className="text-xs text-secondary/70 truncate">
            {roleDisplay}
          </p>
        </div>
        
        <ChevronDown 
          size={16} 
          className={cn(
            "text-secondary/70 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute inset-x-0 top-full mt-2 py-2 rounded-md bg-primary-light border border-secondary/10 shadow-elegant z-10">
          <Link 
            href="/dashboard/profile" 
            className="block px-4 py-2 text-sm text-secondary/90 hover:bg-primary hover:text-secondary"
            onClick={() => setIsOpen(false)}
          >
            View Profile
          </Link>
          <Link 
            href="/settings" 
            className="block px-4 py-2 text-sm text-secondary/90 hover:bg-primary hover:text-secondary"
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
          <div className="my-1 border-t border-secondary/10"></div>
          <Link 
            href="/logout" 
            className="block px-4 py-2 text-sm text-error hover:bg-primary"
            onClick={() => setIsOpen(false)}
          >
            Logout
          </Link>
        </div>
      )}
    </div>
  );
};

export default UserProfile;