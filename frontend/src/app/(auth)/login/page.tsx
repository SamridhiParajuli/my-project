// app/(auth)/login/page.tsx - Updated to show role details
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
  }

  return (
    <div className="flex min-h-screen">
      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center bg-cream-50 p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-dark-900 mb-2">Store Management</h1>
            <p className="text-lg text-dark-600">Staff Portal</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 border border-cream-200">
            <div className="mb-6 pb-6 border-b border-cream-200">
              <h2 className="text-2xl font-semibold text-dark-800">Sign In</h2>
              <p className="text-dark-600 mt-1">Access your management dashboard</p>
            </div>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-dark-700">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input w-full px-4 py-3 border border-cream-300 rounded-lg"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-dark-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full px-4 py-3 border border-cream-300 rounded-lg"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-dark-800 text-cream-100 hover:bg-dark-900 px-6 py-3 rounded-lg font-medium"
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
            
            {/* Test Accounts Section */}
            <div className="mt-8 pt-6 border-t border-cream-200">
              <h3 className="text-sm font-medium text-dark-700 mb-3">Test Accounts:</h3>
              <div className="space-y-2">
                {testAccounts.map((account, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center p-2 rounded hover:bg-cream-50 cursor-pointer text-sm"
                    onClick={() => setTestAccount(account.username, account.password)}
                  >
                    <div>
                      <span className="font-medium">{account.username}</span>
                      <span className="mx-2 text-dark-400">|</span>
                      <span className="text-dark-500">{account.password}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-dark-100 text-dark-600">
                      {account.role}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-dark-500 mt-4 text-center">
                Click on any account to autofill credentials
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Brand Side - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block lg:w-1/2 bg-dark-900 text-cream-100 relative">
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12">
          <h2 className="text-3xl font-bold text-cream-100 mb-6 text-center">
            Store Management System
          </h2>
          <p className="text-xl text-cream-200 max-w-md mx-auto text-center">
            Streamline your operations with our comprehensive management platform
          </p>
          
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
            <div className="bg-dark-700/50 p-4 rounded-xl border border-dark-600">
              <div className="text-lg font-semibold text-yellow-400 mb-1">Tasks</div>
              <p className="text-sm text-cream-200">Manage daily operations</p>
            </div>
            <div className="bg-dark-700/50 p-4 rounded-xl border border-dark-600">
              <div className="text-lg font-semibold text-green-400 mb-1">Inventory</div>
              <p className="text-sm text-cream-200">Track your stock</p>
            </div>
            <div className="bg-dark-700/50 p-4 rounded-xl border border-dark-600">
              <div className="text-lg font-semibold text-red-400 mb-1">Employees</div>
              <p className="text-sm text-cream-200">Manage your team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}