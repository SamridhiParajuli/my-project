// src/services/users.ts
import api from './api'
import { User } from '@/types'

export interface UserCreate {
  username: string
  password: string
  user_type: string
  employee_id?: number | null
  department_id?: number | null
  role: string
  is_active: boolean
}

export interface UserUpdate {
  username?: string
  password?: string
  user_type?: string
  employee_id?: number | null
  department_id?: number | null
  role?: string
  is_active?: boolean
}

export interface UsersParams {
  skip?: number
  limit?: number
  department_id?: number
  role?: string
  is_active?: boolean
  sort?: string
  order?: string
  search?: string
}

/**
 * Get all users with optional filters (admin only)
 */
export const getUsers = async (params: UsersParams = {}) => {
  const response = await api.get('/auth/users', { params })
  return response.data
}

/**
 * Get a single user by ID
 */
export const getUser = async (id: number) => {
  const response = await api.get(`/auth/users/${id}`)
  return response.data
}

/**
 * Create a new user (admin only)
 */
export const createUser = async (userData: UserCreate) => {
  const response = await api.post('/auth/users', userData)
  return response.data
}

/**
 * Update an existing user
 */
export const updateUser = async (id: number, userData: UserUpdate) => {
  const response = await api.put(`/auth/users/${id}`, userData)
  return response.data
}

/**
 * Delete a user (admin only) - actually deactivates the user
 */
export const deleteUser = async (id: number) => {
  const response = await api.delete(`/auth/users/${id}`)
  return response.data
}

/**
 * Activate a user (admin only)
 */
export const activateUser = async (id: number) => {
  const response = await api.patch(`/auth/users/${id}/activate`, {})
  return response.data
}

/**
 * Deactivate a user (admin only)
 */
export const deactivateUser = async (id: number) => {
  const response = await api.patch(`/auth/users/${id}/deactivate`, {})
  return response.data
}

/**
 * Change user role (admin only)
 */
export const changeRole = async (id: number, role: string) => {
  const response = await api.patch(`/auth/users/${id}/change-role`, { role })
  return response.data
}

/**
 * Change user password
 */
export const changePassword = async (id: number, currentPassword: string, newPassword: string) => {
  const data = currentPassword ? 
    { current_password: currentPassword, password: newPassword } :
    { password: newPassword }
  
  const response = await api.patch(`/auth/users/${id}/change-password`, data)
  return response.data
}