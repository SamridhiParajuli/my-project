// src/contexts/AuthContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login as apiLogin, logout as apiLogout, getUser } from '@/services/auth'

export interface User {
  id: number
  username: string
  role: 'admin' | 'manager' | 'lead' | 'staff'
  employee_id?: number
  department_id?: number
  is_active?: boolean
}

export interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  department_id?: number
  position?: string
  status: string
  hire_date?: string
}

export interface Department {
  id: number
  name: string
  department_code?: string
  description?: string
  manager_id?: number
  is_active: boolean
}

export interface AuthContextType {
  user: User | null
  employee: Employee | null
  department: Department | null
  loading: boolean
  login: (username: string, password: string) => Promise<any>
  logout: () => void
  isAdmin: boolean
  isManager: boolean
  isLead: boolean
  isStaff: boolean
  canAccessRoute: (route: string) => boolean
  hasDepartmentAccess: (departmentId: number | null) => boolean
}

// Define route access permissions
const routePermissions: Record<string, string[]> = {
  '/dashboard': ['admin', 'manager', 'lead', 'staff'],
  '/tasks': ['admin', 'manager', 'lead', 'staff'],
  '/preorders': ['admin', 'manager', 'lead', 'staff'],
  '/complaints': ['admin', 'manager', 'lead', 'staff'],
  '/announcements': ['admin', 'manager', 'lead', 'staff'],
  '/inventory': ['admin', 'manager', 'lead'],
  '/temperature': ['admin', 'manager', 'lead', 'staff'],
  '/equipment': ['admin', 'manager', 'lead', 'staff'],
  '/employees': ['admin', 'manager'],
  '/departments': ['admin', 'manager'],
  '/training': ['admin', 'manager', 'lead'],
  '/users': ['admin'],
  '/permissions': ['admin'],
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  employee: null,
  department: null,
  loading: true,
  login: async () => ({}),
  logout: () => {},
  isAdmin: false,
  isManager: false,
  isLead: false,
  isStaff: false,
  canAccessRoute: () => false,
  hasDepartmentAccess: () => false,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = () => {
      const userData = getUser()
      if (userData) {
        if (userData.user) {
          setUser(userData.user)
          setEmployee(userData.employee || null)
          setDepartment(userData.department || null)
        } else {
          setUser(userData)
          setEmployee(null)
          setDepartment(null)
        }
      }
      setLoading(false)
    }

    checkUser()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const data = await apiLogin(username, password)
      setUser(data.user)
      setEmployee(data.employee || null)
      setDepartment(data.department || null)
      router.push('/dashboard')
      return data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = () => {
    apiLogout()
    setUser(null)
    setEmployee(null)
    setDepartment(null)
    router.push('/login')
  }

  // Role-based helper functions
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isLead = user?.role === 'lead'
  const isStaff = user?.role === 'staff'

  const canAccessRoute = (route: string) => {
    if (!user) return false
    const allowedRoles = routePermissions[route] || ['admin']
    return allowedRoles.includes(user.role)
  }

  const hasDepartmentAccess = (departmentId: number | null) => {
    if (!user) return false
    if (isAdmin) return true
    if (isManager && departmentId === user.department_id) return true
    return departmentId === user.department_id
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        department,
        loading,
        login,
        logout,
        isAdmin,
        isManager,
        isLead,
        isStaff,
        canAccessRoute,
        hasDepartmentAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
