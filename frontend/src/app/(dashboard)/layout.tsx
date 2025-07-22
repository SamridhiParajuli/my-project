// app/(dashboard)/layout.tsx
"use client";

import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { Search, Bell, Settings, Menu } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { user, loading } = useAuth();
  const router = useRouter();
  
  React.useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect in the useEffect
  }
  
  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md bg-primary text-secondary hover:bg-primary-light"
        >
          <Menu size={20} />
        </button>
      </div>
      
      {/* Sidebar - hidden on mobile unless toggled */}
      <div 
        className={`
          fixed inset-0 z-20 transform transition-transform duration-300 lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div 
          className="lg:hidden absolute inset-0 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar className="relative z-30 w-64" />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="bg-surface border-b border-secondary-dark/10 shadow-sm">
          <div className="h-16 px-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-sans font-semibold tracking-tight text-primary">
                <span className="hidden lg:inline">Gourmet</span>Pro
              </h1>
            </div>
            
            {/* Search */}
            <div className="hidden md:flex relative w-1/3 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-primary-light/50" />
              </div>
              <input
                type="search"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-secondary-dark/20 rounded-md bg-surface focus:ring-1 focus:ring-accent focus:border-accent text-sm text-primary placeholder:text-primary-light/50"
              />
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors relative">
                <Bell size={20} className="text-primary-light" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
              </button>
              
              <Link href="/settings" className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
                <Settings size={20} className="text-primary-light" />
              </Link>
            </div>
          </div>
        </header>
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6 bg-secondary/10">
          {children}
        </main>
      </div>
    </div>
  );
}