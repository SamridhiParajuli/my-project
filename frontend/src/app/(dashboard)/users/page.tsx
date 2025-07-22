'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { permanentDeleteUser } from '@/services/users'

interface User {
  id: number
  username: string
  user_type: string
  employee_id: number | null
  department_id: number | null
  role: string
  is_active: boolean
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  employee_id: string
  department_id: number | null
}

interface Department {
  id: number
  name: string
  is_active: boolean
}

interface UserFormData {
  username: string
  password: string
  user_type: string
  employee_id: number | null
  department_id: number | null
  role: string
  is_active: boolean
}

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [showInactive, setShowInactive] = useState<boolean>(false)
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    user_type: 'staff',
    employee_id: null,
    department_id: null,
    role: 'staff',
    is_active: true
  })

  const roleOptions = [
    'admin',
    'manager',
    'lead',
    'staff'
  ]

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return
      
      try {
        setLoading(true)
        setError(null)
        
        const usersResponse = await api.get('/auth/users', {
          params: {
            include_inactive: true
          }
        })
        if (usersResponse.data && usersResponse.data.items) {
          setUsers(usersResponse.data.items)
        }
        
        const deptResponse = await api.get('/departments')
        if (deptResponse.data && deptResponse.data.items) {
          setDepartments(deptResponse.data.items)
        }
        
        const empResponse = await api.get('/employees')
        if (empResponse.data && empResponse.data.items) {
          setEmployees(empResponse.data.items)
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load users')
        console.error('Error fetching user data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }

  const filteredUsers = users.filter(user => {
    if (!showInactive && !user.is_active) {
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower) ||
      user.user_type.toLowerCase().includes(searchLower) ||
      (user.employee_id && employees.some(emp => 
        emp.id === user.employee_id && 
        (`${emp.first_name} ${emp.last_name}`).toLowerCase().includes(searchLower)
      )) ||
      (user.department_id && departments.some(dept => 
        dept.id === user.department_id && 
        dept.name.toLowerCase().includes(searchLower)
      ))
    )
  })

  const getEmployeeName = (employeeId: number | null) => {
    if (!employeeId) return 'Not Linked'
    const employee = employees.find(emp => emp.id === employeeId)
    return employee ? `${employee.first_name} ${employee.last_name}` : `Employee ID: ${employeeId}`
  }

  const getDepartmentName = (departmentId: number | null) => {
    if (!departmentId) return 'Not Assigned'
    const dept = departments.find(d => d.id === departmentId)
    return dept ? dept.name : `Department ${departmentId}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'employee_id' || name === 'department_id' ? 
              (value ? parseInt(value) : null) : 
              name === 'is_active' ? value === 'true' : 
              value
    }))
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      user_type: 'staff',
      employee_id: null,
      department_id: null,
      role: 'staff',
      is_active: true
    })
    setEditingId(null)
  }

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      password: '',
      user_type: user.user_type,
      employee_id: user.employee_id,
      department_id: user.department_id,
      role: user.role,
      is_active: user.is_active
    })
    setEditingId(user.id)
    setShowForm(true)
  }

  const handleShowInactiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowInactive(e.target.checked);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      if (!editingId && !formData.password) {
        throw new Error('Password is required for new users')
      }
      
      const basePayload = {
        username: formData.username,
        role: formData.role,
        is_active: formData.is_active
      }
      
      const payload: any = { ...basePayload }
      
      if (formData.password) {
        payload.password = formData.password
      }
      
      if (formData.user_type) {
        payload.user_type = formData.user_type
      }
      
      if (formData.employee_id !== null) {
        payload.employee_id = Number(formData.employee_id) || null
      }
      
      if (formData.department_id !== null) {
        payload.department_id = Number(formData.department_id) || null
      }
      
      if (editingId) {
        await api.put(`/auth/users/${editingId}`, payload)
      } else {
        await api.post('/auth/users', payload)
      }
      
      const response = await api.get('/auth/users', {
        params: {
          include_inactive: true
        }
      })
      
      if (response.data && response.data.items) {
        setUsers(response.data.items)
      }
      
      resetForm()
      setShowForm(false)
      
    } catch (err: any) {
      console.error('API error response:', err)
      if (err.response && err.response.data) {
        console.error('Response data:', err.response.data)
      }
      setError(err.response?.data?.detail || err.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  // ** Soft Delete (Deactivate) Handler **
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/auth/users/${id}`)
      
      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, is_active: false } : user
      ))
      
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user')
      console.error('Error deactivating user:', err)
    } finally {
      setLoading(false)
    }
  }

  // ** Permanent Delete Handler **
  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone and will remove all associations.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // First update the user to remove dependencies
      try {
        await api.put(`/auth/users/${id}`, {
          employee_id: null,
          department_id: null
        })
        console.log("Successfully removed user dependencies")
      } catch (err) {
        console.error("Error removing user dependencies:", err)
        // Continue with delete anyway
      }

      // Then try the permanent delete
      await permanentDeleteUser(id)

      // Only update the UI if deletion was successful
      setUsers(prev => prev.filter(user => user.id !== id))
      setError(null)

    } catch (err: any) {
      // More detailed error handling
      console.error('Error permanently deleting user:', err)
      
      let errorMessage = 'Failed to permanently delete user'
      
      if (err.response) {
        console.error('Response status:', err.response.status)
        console.error('Response data:', err.response.data)
        
        if (err.response.data && err.response.data.detail) {
          errorMessage = err.response.data.detail
        }
      }
      
      setError(errorMessage)
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Users</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full sm:w-64"
          />
          
          <Button
            variant="accent"
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
          >
            {showForm ? 'Cancel' : 'Add User'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="flex items-center mb-4 mt-2">
        <input
          type="checkbox"
          id="showInactive"
          checked={showInactive}
          onChange={handleShowInactiveToggle}
          className="h-4 w-4 text-accent border-gray-300 rounded"
        />
        <label htmlFor="showInactive" className="ml-2 block text-sm text-gray-600">
          Show inactive users
        </label>
      </div>
      
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit User' : 'Add New User'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingId && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required={!editingId}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    {roleOptions.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Type
                  </label>
                  <select
                    name="user_type"
                    value={formData.user_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Linked Employee
                  </label>
                  <select
                    name="employee_id"
                    value={formData.employee_id === null ? '' : formData.employee_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">None</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    name="department_id"
                    value={formData.department_id === null ? '' : formData.department_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">None</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="is_active"
                    value={formData.is_active.toString()}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent">
                  {editingId ? 'Update' : 'Create'} User
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
      ) : filteredUsers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-secondary/10">
              <tr>
                <th className="py-3 px-4 text-left">Username</th>
                <th className="py-3 px-4 text-left">Role</th>
                <th className="py-3 px-4 text-left">Employee</th>
                <th className="py-3 px-4 text-left">Department</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-secondary/5">
                  <td className="py-3 px-4">{user.username}</td>
                  <td className="py-3 px-4">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                  <td className="py-3 px-4">{getEmployeeName(user.employee_id)}</td>
                  <td className="py-3 px-4">{getDepartmentName(user.department_id)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </Button>
                      
                      {currentUser && user.id !== currentUser.id && (
                        <>
                          {/* Soft Delete (Deactivate) */}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            title="Deactivate user (keeps record in database)"
                          >
                            Deactivate
                          </Button>
                          {/* Permanent Delete */}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete(user.id)}
                            title="Permanently delete user from database"
                          >
                            Delete Permanently
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              {showInactive 
                ? "No users found matching your search criteria." 
                : "No active users found. Try enabling 'Show inactive users' to see all users."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}