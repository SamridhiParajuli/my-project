// app/(dashboard)/layout.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, Bell, Settings, Menu, X, 
  ChevronDown, ChevronRight,
  ShoppingBag, Clipboard, MessageSquare,
  Building, User, Shield, BookOpen,
  Thermometer, PencilRuler, ShoppingCart, Home
} from 'lucide-react';

// Group sidebar items into categories
const sidebarGroups = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", icon: <Home size={18} />, label: "Dashboard" },
    ]
  },
  {
    title: "Operations",
    items: [
      { href: "/tasks", icon: <Clipboard size={18} />, label: "Tasks" },
      { href: "/inventory", icon: <ShoppingBag size={18} />, label: "Inventory" },
      { href: "/preorders", icon: <ShoppingCart size={18} />, label: "Pre-Orders" },
      { href: "/temperature", icon: <Thermometer size={18} />, label: "Temperature" },
      { href: "/equipment", icon: <PencilRuler size={18} />, label: "Equipment" },
    ]
  },
  {
    title: "Communication",
    items: [
      { href: "/announcements", icon: <MessageSquare size={18} />, label: "Announcements" },
      { href: "/complaints", icon: <MessageSquare size={18} />, label: "Complaints" },
    ]
  },
  {
    title: "Management",
    items: [
      { href: "/departments", icon: <Building size={18} />, label: "Departments" },
      { href: "/employees", icon: <User size={18} />, label: "Employees" },
      { href: "/training", icon: <BookOpen size={18} />, label: "Training" },
      { href: "/users", icon: <User size={18} />, label: "Users" },
      { href: "/permissions", icon: <Shield size={18} />, label: "Permissions" },
    ]
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Initially hidden on all screens
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Main": false,
    "Operations": false,
    "Communication": false,
    "Management": false
  });
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState("");
  
  // Update current path for active link highlighting
  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);
  
  // Toggle group expansion
  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };
  
  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#1C1C1C]">
        <motion.div 
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f7eccf]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        ></motion.div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect in the useEffect
  }
  
  // Subtle pattern SVG background
  const backgroundPattern = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1C1C1C" stroke-width="0.5" opacity="0.05"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#smallGrid)" />
    </svg>
  `;
  
  return (
    <div className="flex h-screen bg-[#f7eccf]/10">
      {/* Background pattern */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-30" 
        dangerouslySetInnerHTML={{ __html: backgroundPattern }}
      />
      
      {/* Sidebar toggle button - visible on all screens */}
      <div className="fixed top-4 left-4 z-30">
        <motion.button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 rounded-full bg-[#1C1C1C] text-[#f7eccf] hover:bg-[#333333] shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </motion.button>
      </div>
      
      {/* Sidebar - glass morphism design */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            className="fixed inset-0 z-20"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            
            <motion.div 
              className="relative z-30 w-72 h-full py-6 px-4 flex flex-col bg-gradient-to-b from-[#1C1C1C] to-[#333333] text-[#f7eccf] shadow-2xl overflow-hidden"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {/* Logo area */}
              <div className="px-4 mb-8 mt-10">
                <motion.div 
                  className="text-2xl font-bold tracking-tight"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <span>Summerhill</span>
                  <span className="ml-2 text-[#f7eccf]">Market</span>
                </motion.div>
              </div>
              
              {/* User profile pill */}
              <motion.div 
                className="mx-2 mb-6 p-3 rounded-2xl bg-[#f7eccf]/10 backdrop-blur-sm hover:bg-[#f7eccf]/20 transition-all cursor-pointer"
                whileHover={{ scale: 1.02 }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f7eccf] to-[#e9d8ae] flex items-center justify-center text-[#1C1C1C] font-bold">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">
                      {user.username || 'User'}
                    </p>
                    <p className="text-xs text-[#f7eccf]/70 capitalize truncate">
                      {user.role}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              {/* Navigation Groups */}
              <div className="flex-1 overflow-y-auto px-2 space-y-1 sidebar-scroll">
                {sidebarGroups.map((group, groupIndex) => (
                  <motion.div 
                    key={group.title}
                    className="mb-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (groupIndex + 3), duration: 0.4 }}
                  >
                    {/* Group header */}
                    <motion.button
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium uppercase text-[#f7eccf]/60 hover:text-[#f7eccf]"
                      onClick={() => toggleGroup(group.title)}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span>{group.title}</span>
                      <motion.div
                        animate={{ rotate: expandedGroups[group.title] ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight size={14} />
                      </motion.div>
                    </motion.button>
                    
                    {/* Group items */}
                    <AnimatePresence>
                      {expandedGroups[group.title] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          {group.items.map((item, i) => {
                            const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                            
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setCurrentPath(item.href);
                                  setSidebarOpen(false);
                                }}
                              >
                                <motion.div
                                  className={`flex items-center gap-3 px-4 py-3 my-1 rounded-xl text-sm font-medium transition-all  ${
                                    isActive 
                                      ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                                      : 'text-[#f7eccf]/80 hover:bg-[#f7eccf]/10'
                                  }`}
                                  whileHover={{ x: 4 }}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ 
                                    delay: 0.1 * (i + 1), 
                                    duration: 0.3,
                                    x: { duration: 0.2 } 
                                  }}
                                >
                                  <div className={isActive ? 'text-[#1C1C1C]' : 'text-[#f7eccf]/60'}>
                                    {item.icon}
                                  </div>
                                  <span>{item.label}</span>
                                  {isActive && (
                                    <motion.div
                                      layoutId="activePill"
                                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[#1C1C1C]"
                                      transition={{ duration: 0.3 }}
                                    />
                                  )}
                                </motion.div>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
              
              {/* Logout button */}
              <motion.div 
                className="mt-4 px-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <motion.button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#f7eccf]/80 hover:bg-[#f7eccf]/10 text-sm font-medium"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <motion.div 
        className="flex-1 flex flex-col overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Top navbar - glass morphism */}
        <motion.header 
          className="bg-[#1C1C1C] backdrop-blur-md shadow-lg z-10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="h-16 px-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 md:w-0"></div> {/* This creates space for the toggle button */}
      <h1 className="text-xl font-sans font-semibold tracking-tight text-[#f7eccf] md:ml-12">
        <span>Summerhill</span>
        <span className="ml-2 hidden md:inline">Market</span>
      </h1>
            </div>
            
           
            
            {/* Actions */}
            <div className="flex items-center space-x-2">
              <motion.button 
                className="p-2 rounded-full hover:bg-[#333333] transition-colors relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell size={20} className="text-[#f7eccf]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </motion.button>
              
             
              
              <motion.div 
                className="ml-2 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#333333] hover:bg-[#444444] cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f7eccf] to-[#e9d8ae] flex items-center justify-center text-[#1C1C1C] text-xs font-bold">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-[#f7eccf]">{user.username}</span>
              </motion.div>
            </div>
          </div>
        </motion.header>
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f7eccf]/5 relative">
          {children}
        </main>
      </motion.div>
    </div>
  );
}