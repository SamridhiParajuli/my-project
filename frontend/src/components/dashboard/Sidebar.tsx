// Updated Sidebar.tsx with corrected paths and logout button
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import SidebarLink from './SidebarLink';
import UserProfile from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';

// You may need to adjust these imports based on your actual icon library
import {
  Home,
  Users,
  Clipboard,
  MessageSquare,
  Building,
  Briefcase,
  ShoppingBag,
  Shield,
  ShoppingCart,
  Thermometer,
  Book,
  LogOut,
  User,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  
  // Handle logout function
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  
  return (
    <div className={cn(
      'flex flex-col h-screen border-r border-secondary-dark/20 bg-gradient-to-b from-primary to-primary-dark text-secondary',
      className
    )}>
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <span className="font-sans text-primary-dark font-bold text-xl">G</span>
          </div>
          <h1 className="font-sans text-xl font-bold tracking-tight text-secondary">
            Gourmet<span className="text-accent">Pro</span>
          </h1>
        </div>
      </div>
      
      <div className="mt-2 px-4">
        <UserProfile />
      </div>
      
      <div className="px-2 mt-8 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {/* OPTION 1: Update paths to match file structure */}
          <SidebarLink href="/dashboard" icon={<Home size={18} />} active={pathname === '/dashboard'}>
            Dashboard
          </SidebarLink>
          
          <SidebarLink href="/employees" icon={<Users size={18} />} active={pathname.includes('/employees')}>
            Employees
          </SidebarLink>
          
          <SidebarLink href="/tasks" icon={<Clipboard size={18} />} active={pathname.includes('/tasks')}>
            Tasks
          </SidebarLink>
          
          <SidebarLink href="/announcements" icon={<MessageSquare size={18} />} active={pathname.includes('/announcements')}>
            Announcements
          </SidebarLink>
          
          <SidebarLink href="/complaints" icon={<MessageSquare size={18} />} active={pathname.includes('/complaints')}>
            Complaints
          </SidebarLink>

          <SidebarLink href="/departments" icon={<Building size={18} />} active={pathname.includes('/departments')}>
            Departments
          </SidebarLink>
          
          <SidebarLink href="/equipment" icon={<Briefcase size={18} />} active={pathname.includes('/equipment')}>
            Equipment
          </SidebarLink>
          
          <SidebarLink href="/inventory" icon={<ShoppingBag size={18} />} active={pathname.includes('/inventory')}>
            Inventory
          </SidebarLink>
          
          <SidebarLink href="/permissions" icon={<Shield size={18} />} active={pathname.includes('/permissions')}>
            Permissions
          </SidebarLink>
          
          <SidebarLink href="/preorders" icon={<ShoppingCart size={18} />} active={pathname.includes('/preorders')}>
            Preorders
          </SidebarLink>
          
          <SidebarLink href="/temperature" icon={<Thermometer size={18} />} active={pathname.includes('/temperature')}>
            Temperature
          </SidebarLink>
          
          <SidebarLink href="/training" icon={<Book size={18} />} active={pathname.includes('/training')}>
            Training
          </SidebarLink>
          
          <SidebarLink href="/users" icon={<User size={18} />} active={pathname.includes('/users')}>
            Users
          </SidebarLink>
          
          <SidebarLink href="/profile" icon={<User size={18} />} active={pathname.includes('/profile')}>
            Profile
          </SidebarLink>
          
          {/* OPTION 2: Alternative approach - keep dashboard prefix in paths */}
          {/* Uncomment this section and comment out the above links if you move your pages to /app/dashboard/[section] */}
          {/*
          <SidebarLink href="/dashboard" icon={<Home size={18} />} active={pathname === '/dashboard'}>
            Dashboard
          </SidebarLink>
          
          <SidebarLink href="/dashboard/employees" icon={<Users size={18} />} active={pathname.includes('/dashboard/employees')}>
            Employees
          </SidebarLink>
          
          // ... other links with /dashboard/ prefix
          */}
        </div>
      </div>
      
      <div className="mt-auto p-4 border-t border-secondary/10">
        {/* Replace Link with button that calls logout function */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-secondary/70 hover:bg-primary-light hover:text-secondary transition-colors w-full text-left"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;