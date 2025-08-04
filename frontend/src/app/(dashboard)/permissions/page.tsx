'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

// Import icons from lucide-react
import { 
  Shield, 
  Plus, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  AlertCircle,
  ChevronDown,
  Filter,
  RefreshCw
} from 'lucide-react'

// Define animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const formVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
}

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

  // Refresh permissions for the selected role
  const refreshPermissions = async () => {
    try {
      setLoading(true)
      
      // Fetch permissions for the selected role
      const response = await api.get(`/permissions/roles/${selectedRole}`)
      if (response.data && response.data.items) {
        setRolePermissions(prev => ({
          ...prev,
          [selectedRole]: response.data.items
        }))
      }
      
      setLoading(false)
    } catch (err) {
      console.error(`Error refreshing permissions for role ${selectedRole}:`, err)
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-[#f7eccf]">Access Denied</h2>
                <p className="text-[#f7eccf]/70">You don't have permission to view this page.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Card */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
                  <Shield className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Permissions Management</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Control access levels and capabilities for each role
                  </p>
                </div>
              </div>
              
              <motion.button
                onClick={() => {
                  resetPermissionForm()
                  setShowForm(!showForm)
                }}
                className="px-4 py-2.5 bg-[#f7eccf] text-[#1C1C1C] rounded-full flex items-center gap-2 font-medium shadow-md"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {showForm ? (
                  <>
                    <X size={18} />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Add Permission</span>
                  </>
                )}
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="bg-red-500/10 text-red-500 p-4 rounded-2xl flex items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold text-[#f7eccf] mb-6 flex items-center">
                  <Plus size={20} className="mr-2 text-[#f7eccf]/70" />
                  {editingPermissionId ? 'Edit Permission' : 'Add New Permission'}
                </h2>
                
                <form onSubmit={handlePermissionSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                        Permission Name
                      </label>
                      <input
                        type="text"
                        name="permission_name"
                        value={permissionForm.permission_name}
                        onChange={handlePermissionFormChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                        Category
                      </label>
                      <div className="relative">
                        <select
                          name="category"
                          value={permissionForm.category}
                          onChange={handlePermissionFormChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none"
                        >
                          {categories.map(category => (
                            <option key={category} value={category} className="bg-[#1C1C1C]">
                              {category.replace('_', ' ').split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={permissionForm.description}
                        onChange={handlePermissionFormChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent h-24"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <motion.button
                      type="button"
                      className="px-4 py-2.5 bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] rounded-xl font-medium shadow-md flex items-center gap-2"
                      onClick={() => {
                        resetPermissionForm()
                        setShowForm(false)
                      }}
                      whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X size={18} />
                      Cancel
                    </motion.button>
                    <motion.button 
                      type="submit" 
                      className="px-4 py-2.5 bg-[#f7eccf] text-[#1C1C1C] rounded-xl font-medium shadow-md flex items-center gap-2"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check size={18} />
                      {editingPermissionId ? 'Update Permission' : 'Add Permission'}
                    </motion.button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Search and Role Filter */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-64">
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none"
                  >
                    {roles.map(role => (
                      <option key={role} value={role} className="bg-[#1C1C1C]">
                        {role.charAt(0).toUpperCase() + role.slice(1)} Role
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>
            
            {/* Filter options */}
            <div className="flex items-center pt-4 border-t border-[#f7eccf]/10 mt-4">
              <div className="flex items-center gap-2 text-[#f7eccf]/70 mr-3">
                <Filter size={16} />
                <span className="text-sm">Role:</span>
                <span className="text-sm font-medium text-[#f7eccf]">
                  {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                </span>
              </div>
              <motion.button
                className="ml-auto p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                onClick={refreshPermissions}
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <RefreshCw size={16} />
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center p-12">
                <motion.div 
                  className="rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f7eccf]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-[#f7eccf] mb-6">
                  {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Role Permissions
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#f7eccf]/10">
                        <th className="py-3 px-4 text-left text-sm font-medium text-[#f7eccf]/70">Permission</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-[#f7eccf]/70">View</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-[#f7eccf]/70">Create</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-[#f7eccf]/70">Edit</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-[#f7eccf]/70">Delete</th>
                        <th className="py-3 px-4 text-right text-sm font-medium text-[#f7eccf]/70">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7eccf]/10">
                      {filteredPermissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#f7eccf]/70">
                            No permissions found
                          </td>
                        </tr>
                      ) : (
                        filteredPermissions.map(perm => {
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
                            <motion.tr 
                              key={perm.id} 
                              className="hover:bg-[#f7eccf]/5 transition-colors"
                              whileHover={{ 
                                backgroundColor: 'rgba(247, 236, 207, 0.07)',
                                transition: { duration: 0.2 }
                              }}
                            >
                              <td className="py-4 px-4">
                                <div>
                                  <div className="font-medium text-[#f7eccf]">{perm.permission_name}</div>
                                  {perm.description && (
                                    <div className="text-xs text-[#f7eccf]/70 mt-1">{perm.description}</div>
                                  )}
                                  {perm.category && (
                                    <div className="mt-2">
                                      <span className="inline-block px-2 py-1 bg-[#f7eccf]/10 text-[#f7eccf]/80 text-xs rounded-full">
                                        {perm.category}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center">
                                  <motion.div 
                                    className="relative"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={rolePerm.can_view}
                                      onChange={(e) => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_view',
                                        e.target.checked
                                      )}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                        rolePerm.can_view 
                                          ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                                          : 'bg-[#f7eccf]/10 text-[#f7eccf]/30'
                                      }`}
                                      onClick={() => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_view',
                                        !rolePerm.can_view
                                      )}
                                    >
                                      {rolePerm.can_view && <Check size={14} />}
                                    </div>
                                  </motion.div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center">
                                  <motion.div 
                                    className="relative"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={rolePerm.can_create}
                                      onChange={(e) => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_create',
                                        e.target.checked
                                      )}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                        rolePerm.can_create 
                                          ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                                          : 'bg-[#f7eccf]/10 text-[#f7eccf]/30'
                                      }`}
                                      onClick={() => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_create',
                                        !rolePerm.can_create
                                      )}
                                    >
                                      {rolePerm.can_create && <Check size={14} />}
                                    </div>
                                  </motion.div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center">
                                  <motion.div 
                                    className="relative"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={rolePerm.can_edit}
                                      onChange={(e) => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_edit',
                                        e.target.checked
                                      )}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                        rolePerm.can_edit 
                                          ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                                          : 'bg-[#f7eccf]/10 text-[#f7eccf]/30'
                                      }`}
                                      onClick={() => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_edit',
                                        !rolePerm.can_edit
                                      )}
                                    >
                                      {rolePerm.can_edit && <Check size={14} />}
                                    </div>
                                  </motion.div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center">
                                  <motion.div 
                                    className="relative"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={rolePerm.can_delete}
                                      onChange={(e) => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_delete',
                                        e.target.checked
                                      )}
                                      className="sr-only"
                                    />
                                    <div 
                                      className={`h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                        rolePerm.can_delete 
                                          ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                                          : 'bg-[#f7eccf]/10 text-[#f7eccf]/30'
                                      }`}
                                      onClick={() => handlePermissionToggle(
                                        selectedRole,
                                        perm.id,
                                        'can_delete',
                                        !rolePerm.can_delete
                                      )}
                                    >
                                      {rolePerm.can_delete && <Check size={14} />}
                                    </div>
                                  </motion.div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex justify-end space-x-2">
                                  <motion.button
                                    onClick={() => handleEditPermission(perm)}
                                    className="p-2 bg-[#f7eccf]/10 text-[#f7eccf] rounded-full hover:bg-[#f7eccf]/20 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Edit size={16} />
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleDeletePermission(perm.id)}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}