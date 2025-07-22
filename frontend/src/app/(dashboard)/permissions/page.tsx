'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

interface Permission {
  id: number
  permission_name: string
  description: string | null
  category: string | null
}

interface RolePermission {
  role: string
  permission_id: number
  permission_name?: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

interface PermissionFormData {
  permission_name: string
  description: string
  category: string
}

interface RolePermissionMap {
  [key: string]: Array<{
    permission_id: number
    permission_name: string
    can_view: boolean
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
  }>
}

export default function PermissionsPage() {
  const { isAdmin } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMap>({})
  const [selectedRole, setSelectedRole] = useState<string>('admin')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(null)
  const [permissionForm, setPermissionForm] = useState<PermissionFormData>({
    permission_name: '',
    description: '',
    category: 'general'
  })
  
  // Available roles in the system
  const roles = ['admin', 'manager', 'lead', 'staff']
  
  // Permission categories
  const categories = [
    'general', 
    'user_management',
    'employee_management',
    'department_management',
    'task_management',
    'inventory_management',
    'orders_management',
    'equipment_management',
    'temperature_monitoring',
    'training_management',
    'reporting'
  ]

  // Fetch permissions data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Try different paths for permissions
        let permissionsData: Permission[] = []
        let permissionsError = null
        
        // Try the main permissions endpoint
        try {
          const permResponse = await api.get('/permissions')
          if (permResponse.data && permResponse.data.items) {
            permissionsData = permResponse.data.items
          }
        } catch (err: any) {
          permissionsError = err
          console.error('Error fetching permissions from main endpoint:', err)
          
          // Try alternative endpoint
          try {
            const altResponse = await api.get('/api/permissions')
            if (altResponse.data && altResponse.data.items) {
              permissionsData = altResponse.data.items
              permissionsError = null // Clear error if alternative works
            }
          } catch (altErr) {
            console.error('Error fetching permissions from alternative endpoint:', altErr)
          }
        }
        
        if (permissionsError && permissionsData.length === 0) {
          throw permissionsError
        }
        
        setPermissions(permissionsData)
        
        // Fetch role permissions for each role
        const rolePermMap: RolePermissionMap = {}
        
        for (const role of roles) {
          try {
            // Try different paths for role permissions
            let rolePermData = []
            try {
              const rolePermResponse = await api.get(`/permissions/roles/${role}`)
              if (rolePermResponse.data && rolePermResponse.data.items) {
                rolePermData = rolePermResponse.data.items
              }
            } catch (roleErr) {
              // Try alternative endpoint
              try {
                const altRoleResponse = await api.get(`/api/permissions/roles/${role}`)
                if (altRoleResponse.data && altRoleResponse.data.items) {
                  rolePermData = altRoleResponse.data.items
                }
              } catch (altRoleErr) {
                // Silently fail - some roles might not have permissions
                console.warn(`Could not fetch permissions for role ${role}`)
              }
            }
            
            rolePermMap[role] = rolePermData
          } catch (err) {
            console.error(`Error fetching permissions for role ${role}:`, err)
            // Continue with other roles even if one fails
          }
        }
        
        setRolePermissions(rolePermMap)
        
      } catch (err: any) {
        setError(err.message || 'Failed to load permissions')
        console.error('Error fetching permission data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin])

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Filter permissions based on search term
  const filteredPermissions = permissions.filter(perm => {
    const searchLower = searchTerm.toLowerCase()
    return (
      perm.permission_name.toLowerCase().includes(searchLower) ||
      (perm.description && perm.description.toLowerCase().includes(searchLower)) ||
      (perm.category && perm.category.toLowerCase().includes(searchLower))
    )
  })

  // Handle permission form input changes
  const handlePermissionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPermissionForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Reset permission form
  const resetPermissionForm = () => {
    setPermissionForm({
      permission_name: '',
      description: '',
      category: 'general'
    })
    setEditingPermissionId(null)
  }

  // Handle permission form submission
  const handlePermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      if (editingPermissionId) {
        // Update existing permission
        await api.put(`/permissions/${editingPermissionId}`, permissionForm)
      } else {
        // Create new permission
        await api.post('/permissions', permissionForm)
      }
      
      // Refresh permissions
      const response = await api.get('/permissions')
      if (response.data && response.data.items) {
        setPermissions(response.data.items)
      }
      
      // Reset form and close it
      resetPermissionForm()
      setShowForm(false)
      
    } catch (err: any) {
      setError(err.message || 'Failed to save permission')
      console.error('Error saving permission:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load permission for editing
  const handleEditPermission = (permission: Permission) => {
    setPermissionForm({
      permission_name: permission.permission_name,
      description: permission.description || '',
      category: permission.category || 'general'
    })
    setEditingPermissionId(permission.id)
    setShowForm(true)
  }

  // Handle permission deletion
  const handleDeletePermission = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/permissions/${id}`)
      
      // Remove from local state
      setPermissions(prev => prev.filter(p => p.id !== id))
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete permission')
      console.error('Error deleting permission:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle role permission toggle
  const handlePermissionToggle = async (
    role: string,
    permissionId: number,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      // Update the permission
      await api.put(`/permissions/roles/${role}/${permissionId}`, {
        [field]: value
      })
      
      // Update local state
      setRolePermissions(prev => {
        const updatedRolePerms = { ...prev }
        if (updatedRolePerms[role]) {
          updatedRolePerms[role] = updatedRolePerms[role].map(rp => {
            if (rp.permission_id === permissionId) {
              return { ...rp, [field]: value }
            }
            return rp
          })
        }
        return updatedRolePerms
      })
      
    } catch (err: any) {
      setError(err.message || 'Failed to update permission')
      console.error('Error updating permission:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Permissions Management</h1>
        
        <div className="flex flex-wrap gap-3">
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            >
              {roles.map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <SearchBar
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full sm:w-64"
          />
          
          <Button
            variant="accent"
            onClick={() => {
              resetPermissionForm()
              setShowForm(!showForm)
            }}
          >
            {showForm ? 'Cancel' : 'Add Permission'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingPermissionId ? 'Edit Permission' : 'Add New Permission'}
            </h2>
            
            <form onSubmit={handlePermissionSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Permission Name</label>
                  <input
                    type="text"
                    name="permission_name"
                    value={permissionForm.permission_name}
                    onChange={handlePermissionFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    name="category"
                    value={permissionForm.category}
                    onChange={handlePermissionFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ').split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={permissionForm.description}
                    onChange={handlePermissionFormChange}
                    className="w-full p-2 border border-gray-300 rounded-md h-24"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetPermissionForm()
                    setShowForm(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  {editingPermissionId ? 'Update Permission' : 'Add Permission'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Role Permissions
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-secondary/10">
                  <tr>
                    <th className="py-3 px-4 text-left">Permission</th>
                    <th className="py-3 px-4 text-center">View</th>
                    <th className="py-3 px-4 text-center">Create</th>
                    <th className="py-3 px-4 text-center">Edit</th>
                    <th className="py-3 px-4 text-center">Delete</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPermissions.map(perm => {
                    // Find corresponding role permission
                    const rolePerm = rolePermissions[selectedRole]?.find(
                      rp => rp.permission_id === perm.id
                    ) || {
                      permission_id: perm.id,
                      permission_name: perm.permission_name,
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false
                    }
                    
                    return (
                      <tr key={perm.id} className="hover:bg-secondary/5">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{perm.permission_name}</div>
                            {perm.description && (
                              <div className="text-xs text-gray-500">{perm.description}</div>
                            )}
                            {perm.category && (
                              <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-xs rounded-full">
                                  {perm.category}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rolePerm.can_view}
                            onChange={(e) => handlePermissionToggle(
                              selectedRole,
                              perm.id,
                              'can_view',
                              e.target.checked
                            )}
                            className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rolePerm.can_create}
                            onChange={(e) => handlePermissionToggle(
                              selectedRole,
                              perm.id,
                              'can_create',
                              e.target.checked
                            )}
                            className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rolePerm.can_edit}
                            onChange={(e) => handlePermissionToggle(
                              selectedRole,
                              perm.id,
                              'can_edit',
                              e.target.checked
                            )}
                            className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rolePerm.can_delete}
                            onChange={(e) => handlePermissionToggle(
                              selectedRole,
                              perm.id,
                              'can_delete',
                              e.target.checked
                            )}
                            className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPermission(perm)}
                            >
                              Edit
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-error hover:bg-error/10"
                              onClick={() => handleDeletePermission(perm.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {filteredPermissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No permissions found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}