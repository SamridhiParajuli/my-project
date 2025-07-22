'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  department_id: number | null
  position: string | null
  status: string
  hire_date: string | null
}

interface Department {
  id: number
  name: string
  is_active: boolean
}

interface EmployeeFormData {
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  department_id: number | null
  position: string
  status: string
  hire_date: string
}

export default function EmployeesPage() {
  const { user, isAdmin, isManager } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: null,
    position: 'Staff',
    status: 'active',
    hire_date: new Date().toISOString().split('T')[0]
  })

  // Available positions in the store
  const positionOptions = [
    'Store Manager',
    'Assistant Store Manager',
    'Department Manager',
    'Lead',
    'Cashier',
    'Clerk',
    'Staff'
  ]

  // Fetch employees and departments
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
        
        // Fetch employees based on user role
        let url = '/employees'
        let params: any = {}
        
        // If manager, only show their department employees
        if (isManager && !isAdmin && user?.department_id) {
          params.department_id = user.department_id
        }
        
        const empResponse = await api.get(url, { params })
        if (empResponse.data && empResponse.data.items) {
          setEmployees(empResponse.data.items)
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load employees')
        console.error('Error fetching employee data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (isAdmin || isManager) {
      fetchData()
    }
  }, [isAdmin, isManager, user?.department_id])

  // Handle search
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.employee_id?.toLowerCase().includes(searchLower) ||
      emp.position?.toLowerCase().includes(searchLower) ||
      departments.find(d => d.id === emp.department_id)?.name.toLowerCase().includes(searchLower)
    )
  })

  // Get department name
  const getDepartmentName = (departmentId: number | null) => {
    if (!departmentId) return 'Not Assigned'
    const dept = departments.find(d => d.id === departmentId)
    return dept ? dept.name : `Department ${departmentId}`
  }

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target
  
  // Special handling for different types of fields
  if (name === 'department_id') {
    // Handle department_id - convert to number or null
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : parseInt(value)
    }))
  } else if (name === 'hire_date') {
    // Handle date fields - ensure proper ISO format
    setFormData(prev => ({
      ...prev,
      [name]: value // Value from date input is already in YYYY-MM-DD format
    }))
  } else {
    // Handle all other fields normally
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
}
  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department_id: null,
      position: 'Staff',
      status: 'active',
      hire_date: new Date().toISOString().split('T')[0]
    })
    setEditingId(null)
  }

  // Load employee data for editing
  const handleEdit = (employee: Employee) => {
    setFormData({
      employee_id: employee.employee_id || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      department_id: employee.department_id,
      position: employee.position || 'Staff',
      status: employee.status || 'active',
      hire_date: employee.hire_date || new Date().toISOString().split('T')[0]
    })
    setEditingId(employee.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  try {
    setLoading(true)
    setError(null)
    
    // Create a payload with properly formatted data
    const payload = {
      ...formData,
      // Ensure hire_date is in proper format if it exists
      hire_date: formData.hire_date || null
    }
    
    console.log("Submitting employee data:", payload)
    
    if (editingId) {
      // Update existing employee
      await api.put(`/employees/${editingId}`, payload)
    } else {
      // Create new employee
      await api.post('/employees', payload)
    }
    
    // Refresh employee list
    const response = await api.get('/employees')
    if (response.data && response.data.items) {
      setEmployees(response.data.items)
    }
    
    // Reset form and close it
    resetForm()
    setShowForm(false)
    
  } catch (err: any) {
    console.error('API Error:', err)
    // Enhanced error logging
    if (err.response) {
      console.error('Response status:', err.response.status)
      console.error('Response data:', err.response.data)
      setError(err.response.data?.detail || 'Failed to save employee')
    } else {
      setError(err.message || 'Failed to save employee')
    }
  } finally {
    setLoading(false)
  }
}

  // Handle employee deletion
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/employees/${id}`)
      
      // Remove from local state
      setEmployees(prev => prev.filter(emp => emp.id !== id))
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee')
      console.error('Error deleting employee:', err)
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Employees</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          
          {(isAdmin || isManager) && (
            <Button
              variant="accent"
              onClick={() => {
                resetForm()
                setShowForm(!showForm)
              }}
            >
              {showForm ? 'Cancel' : 'Add Employee'}
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
              {editingId ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee ID</label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    name="department_id"
                    value={formData.department_id || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Position</label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {positionOptions.map(pos => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Hire Date</label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
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
                  {editingId ? 'Update Employee' : 'Add Employee'}
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
      ) : filteredEmployees.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-secondary/10">
              <tr>
                <th className="py-3 px-4 text-left">Employee ID</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Department</th>
                <th className="py-3 px-4 text-left">Position</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map(employee => (
                <tr key={employee.id} className="hover:bg-secondary/5">
                  <td className="py-3 px-4">{employee.employee_id}</td>
                  <td className="py-3 px-4">{`${employee.first_name} ${employee.last_name}`}</td>
                  <td className="py-3 px-4">{getDepartmentName(employee.department_id)}</td>
                  <td className="py-3 px-4">{employee.position}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' :
                      employee.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                      >
                        Edit
                      </Button>
                      
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-error hover:bg-error/10"
                          onClick={() => handleDelete(employee.id)}
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
            <p className="text-gray-500">No employees found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}