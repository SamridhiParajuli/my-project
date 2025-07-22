// src/services/permissions.ts - Fixed API endpoints
import api from './api'

export interface Permission {
  id: number
  permission_name: string
  description?: string
  category?: string
  created_at?: string
}

export interface RolePermission {
  role: string
  permission_id: number
  permission_name?: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface PermissionCreate {
  permission_name: string
  description?: string
  category?: string
}

export interface PermissionUpdate {
  permission_name?: string
  description?: string
  category?: string
}

export interface RolePermissionCreate {
  role: string
  permission_id: number
  can_view?: boolean
  can_create?: boolean
  can_edit?: boolean
  can_delete?: boolean
}

export interface RolePermissionUpdate {
  can_view?: boolean
  can_create?: boolean
  can_edit?: boolean
  can_delete?: boolean
}

/**
 * Get all permissions
 */
export const getPermissions = async (params: any = {}) => {
  // Check API connection first
  try {
    // Try to get the API root to check connection
    await api.get('/')
  } catch (error) {
    console.error('API connection test failed:', error)
    // Continue with the actual request
  }

  try {
    const response = await api.get('/permissions', { params })
    return response.data
  } catch (error: any) {
    console.error('Permissions API error:', error)
    
    // Fallback to alternative endpoint if original fails
    if (error.response?.status === 404) {
      // Try alternative path format
      try {
        const altResponse = await api.get('/api/permissions', { params })
        return altResponse.data
      } catch (altError) {
        console.error('Alternative permissions endpoint also failed:', altError)
        throw altError
      }
    }
    
    throw error
  }
}

/**
 * Get permissions by role
 */
export const getRolePermissions = async () => {
  try {
    const response = await api.get('/permissions/roles')
    return response.data
  } catch (error: any) {
    console.error('Role permissions API error:', error)
    
    // Fallback to alternative endpoint if original fails
    if (error.response?.status === 404) {
      // Try alternative path format
      try {
        const altResponse = await api.get('/api/permissions/roles')
        return altResponse.data
      } catch (altError) {
        console.error('Alternative role permissions endpoint also failed:', altError)
        throw altError
      }
    }
    
    throw error
  }
}

/**
 * Get a single permission by ID
 */
export const getPermission = async (id: number) => {
  const response = await api.get(`/permissions/${id}`)
  return response.data
}

/**
 * Create a new permission
 */
export const createPermission = async (permissionData: PermissionCreate) => {
  const response = await api.post('/permissions', permissionData)
  return response.data
}

/**
 * Update an existing permission
 */
export const updatePermission = async (id: number, permissionData: PermissionUpdate) => {
  const response = await api.put(`/permissions/${id}`, permissionData)
  return response.data
}

/**
 * Delete a permission
 */
export const deletePermission = async (id: number) => {
  const response = await api.delete(`/permissions/${id}`)
  return response.data
}

/**
 * Assign a permission to a role
 */
export const assignPermissionToRole = async (rolePermission: RolePermissionCreate) => {
  const response = await api.post('/permissions/roles', rolePermission)
  return response.data
}

/**
 * Update a role's permission
 */
export const updateRolePermission = async (
  role: string, 
  permissionId: number, 
  permissionData: RolePermissionUpdate
) => {
  const response = await api.put(`/permissions/roles/${role}/${permissionId}`, permissionData)
  return response.data
}

/**
 * Remove a permission from a role
 */
export const removePermissionFromRole = async (role: string, permissionId: number) => {
  const response = await api.delete(`/permissions/roles/${role}/${permissionId}`)
  return response.data
}