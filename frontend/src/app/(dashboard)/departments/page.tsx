'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

interface Department {
  id: number
  name: string
  department_code: string | null
  description: string | null
  manager_id: number | null
  is_active: boolean
}

interface DepartmentFormData {
  name: string
  department_code: string
  description: string
  manager_id: number | null
  is_active: boolean
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  employee_id: string
  position: string
}

export default function DepartmentsPage() {
  const { user, isAdmin, isManager } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    department_code: '',
    description: '',
    manager_id: null,
    is_active: true
  })

  // Fetch departments and potential managers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch departments
        const deptResponse = await api.get('/departments')
        if (deptResponse.data && deptResponse.data.items) {
          setDepartments(deptResponse.data.items)
        }
        
        // Fetch employees for manager selection
        const empResponse = await api.get('/employees', { 
          params: { 
            position: 'Department Manager' 
          }
        })
        if (empResponse.data && empResponse.data.items) {
          setEmployees(empResponse.data.items)
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load departments')
        console.error('Error fetching department data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (isAdmin || isManager) {
      fetchData()
    }
  }, [isAdmin, isManager])

  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept => {
    const searchLower = searchTerm.toLowerCase()
    return (
      dept.name.toLowerCase().includes(searchLower) ||
      (dept.department_code && dept.department_code.toLowerCase().includes(searchLower)) ||
      (dept.description && dept.description.toLowerCase().includes(searchLower))
    )
  })

  // Get manager name
  const getManagerName = (managerId: number | null) => {
    if (!managerId) return 'Not Assigned'
    const manager = employees.find(emp => emp.id === managerId)
    return manager ? `${manager.first_name} ${manager.last_name}` : `Manager ID: ${managerId}`
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'manager_id' ? (value ? parseInt(value) : null) : 
              name === 'is_active' ? value === 'true' : 
              value
    }))
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      department_code: '',
      description: '',
      manager_id: null,
      is_active: true
    })
    setEditingId(null)
  }

  // Load department data for editing
  const handleEdit = (department: Department) => {
    setFormData({
      name: department.name,
      department_code: department.department_code || '',
      description: department.description || '',
      manager_id: department.manager_id,
      is_active: department.is_active
    })
    setEditingId(department.id)
    setShowForm(true)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      if (editingId) {
        // Update existing department
        await api.put(`/departments/${editingId}`, formData)
      } else {
        // Create new department
        await api.post('/departments', formData)
      }
      
      // Refresh department list
      const response = await api.get('/departments')
      if (response.data && response.data.items) {
        setDepartments(response.data.items)
      }
      
      // Reset form and close it
      resetForm()
      setShowForm(false)
      
    } catch (err: any) {
      setError(err.message || 'Failed to save department')
      console.error('Error saving department:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle department deletion
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/departments/${id}`)
      
      // Remove from local state
      setDepartments(prev => prev.filter(dept => dept.id !== id))
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete department')
      console.error('Error deleting department:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin && !isManager) {
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Departments</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          
          {isAdmin && (
            <Button
              variant="accent"
              onClick={() => {
                resetForm()
                setShowForm(!showForm)
              }}
            >
              {showForm ? 'Cancel' : 'Add Department'}
            </Button>
          )}
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
              {editingId ? 'Edit Department' : 'Add New Department'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Department Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Department Code</label>
                  <input
                    type="text"
                    name="department_code"
                    value={formData.department_code}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md h-24"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Department Manager</label>
                  <select
                    name="manager_id"
                    value={formData.manager_id || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Manager</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="is_active"
                    value={formData.is_active.toString()}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
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
                <Button type="submit" variant="default">
                  {editingId ? 'Update Department' : 'Add Department'}
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
      ) : filteredDepartments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-secondary/10">
              <tr>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Code</th>
                <th className="py-3 px-4 text-left">Manager</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDepartments.map(department => (
                <tr key={department.id} className="hover:bg-secondary/5">
                  <td className="py-3 px-4">{department.name}</td>
                  <td className="py-3 px-4">{department.department_code || '-'}</td>
                  <td className="py-3 px-4">{getManagerName(department.manager_id)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      department.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {department.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(department)}
                      >
                        Edit
                      </Button>
                      
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-error hover:bg-error/10"
                          onClick={() => handleDelete(department.id)}
                        >
                          Delete
                        </Button>
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
            <p className="text-gray-500">No departments found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}