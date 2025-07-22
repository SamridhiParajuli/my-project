// app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { motion, AnimatePresence, Variants } from 'framer-motion'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTestAccounts, setShowTestAccounts] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  // Test accounts from your seed data
  const testAccounts = [
    { username: 'manager3', password: 'password123', role: 'Store Manager (Admin)' },
    { username: 'manager', password: 'manager123', role: 'Department Manager' },
    { username: 'baker', password: 'baker123', role: 'Staff (Bakery)' },
    { username: 'produce', password: 'produce123', role: 'Staff (Produce)' },
    { username: 'butcher', password: 'butcher123', role: 'Staff (Meat)' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      await login(username, password)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login failed:', err)
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const setTestAccount = (username: string, password: string) => {
    setUsername(username)
    setPassword(password)
    setShowTestAccounts(false)
  }

  // Animation variants with smoother transitions
  const containerVariants:Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.25,
        duration: 0.5,
        ease: "easeOut"
      }
    }
  }

  const topPillVariants:Variants = {
    hidden: { 
      y: -60, 
      opacity: 0 
    },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "tween", 
        duration: 0.8,
        ease: [0.2, 0.65, 0.3, 0.9] // Custom cubic bezier curve for smooth motion
      }
    }
  }

  const bottomPillVariants:Variants = {
    hidden: { 
      y: 60, 
      opacity: 0 
    },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "tween", 
        duration: 0.8,
        ease: [0.2, 0.65, 0.3, 0.9] // Same custom easing
      }
    }
  }

  return (
    <div className="relative min-h-[100svh] flex items-center justify-center p-4">
      {/* Background Image */}
      <Image 
        src="/forest-hill-grocery.png" 
        alt="Summerhill Market" 
        fill 
        className="object-cover object-center z-0"
        priority
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>
      
      {/* Content */}
      <motion.div 
        className="z-20 w-full max-w-md md:max-w-lg lg:max-w-xl flex flex-col items-center gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top Pill - Logo */}
        <motion.div 
          className="bg-[#f7eccf] rounded-3xl shadow-xl p-6 w-full flex justify-center items-center transform hover:scale-[1.01] transition-transform"
          variants={topPillVariants}
        >
          <div className="relative w-56 h-16">
            <Image 
              src="/logo.png" 
              alt="Summerhill Market" 
              fill
              className="object-contain"
            />
          </div>
        </motion.div>
        
        {/* Bottom Pill - Form */}
        <motion.div 
          className="bg-white/20 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden w-full border border-white/10 transition-all"
          variants={bottomPillVariants}
        >
          <div className="p-8">
            <h2 className="text-xl font-semibold text-center text-[#f7eccf] mb-6">STAFF PORTAL</h2>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-[#f7eccf]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f7eccf] border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-[#f7eccf]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f7eccf] border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-[#1C1C1C] to-[#333333] text-[#f7eccf] px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all transform hover:translate-y-[-2px] active:translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
            
            {/* Small button for test accounts */}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowTestAccounts(true)}
                className="text-xs px-2 py-1 rounded-full bg-white/20 text-[#f7eccf]/80 hover:bg-white/30 transition-colors text-center"
              >
                Dev Accounts
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Test Accounts Modal */}
      <AnimatePresence>
        {showTestAccounts && (
          <>
            {/* Modal Backdrop */}
            <motion.div 
              className="fixed inset-0 bg-black/70 z-30 backdrop-blur-sm"
              onClick={() => setShowTestAccounts(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            ></motion.div>
            
            {/* Modal Content */}
            <motion.div 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 z-40 w-full max-w-md"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Test Accounts</h3>
                <button 
                  onClick={() => setShowTestAccounts(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {testAccounts.map((account, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center p-3 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setTestAccount(account.username, account.password)}
                  >
                    <div>
                      <span className="font-medium">{account.username}</span>
                      <span className="mx-2 text-gray-400">|</span>
                      <span className="text-gray-500">{account.password}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                      {account.role}
                    </span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                Click on any account to autofill credentials
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}