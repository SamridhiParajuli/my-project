// app/(dashboard)/employees/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  Badge,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react'

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

// Animation variants
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

const cardVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    transition: { duration: 0.3 }
  }
}

const formVariants: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  visible: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const buttonVariants = {
  hover: { 
    scale: 1.05,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
  },
  tap: { 
    scale: 0.95 
  }
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
  const formRef = useRef<HTMLDivElement>(null)
  const [sortBy, setSortBy] = useState<string>('first_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{show: boolean, employee: Employee | null}>({
    show: false,
    employee: null
  })
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

  // Handle search and filter
  const filteredAndSortedEmployees = employees
    .filter(emp => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = searchTerm === '' || (
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.last_name?.toLowerCase().includes(searchLower) ||
        emp.employee_id?.toLowerCase().includes(searchLower) ||
        emp.position?.toLowerCase().includes(searchLower) ||
        departments.find(d => d.id === emp.department_id)?.name.toLowerCase().includes(searchLower)
      )
      
      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus
      const matchesDepartment = filterDepartment === 'all' || emp.department_id?.toString() === filterDepartment
      
      return matchesSearch && matchesStatus && matchesDepartment
    })
    .sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'first_name':
          aVal = a.first_name || ''
          bVal = b.first_name || ''
          break
        case 'last_name':
          aVal = a.last_name || ''
          bVal = b.last_name || ''
          break
        case 'employee_id':
          aVal = a.employee_id || ''
          bVal = b.employee_id || ''
          break
        case 'hire_date':
          aVal = a.hire_date || ''
          bVal = b.hire_date || ''
          break
        default:
          aVal = a.first_name || ''
          bVal = b.first_name || ''
      }
      
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal)
      } else {
        return bVal.localeCompare(aVal)
      }
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
    
    // Scroll to form section after a brief delay to ensure form is rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      })
    }, 100)
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
  const handleDeleteClick = (employee: Employee) => {
    setDeleteConfirmModal({ show: true, employee })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.employee) return
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/employees/${deleteConfirmModal.employee.id}`)
      
      // Remove from local state
      setEmployees(prev => prev.filter(emp => emp.id !== deleteConfirmModal.employee!.id))
      
      // Close modal
      setDeleteConfirmModal({ show: false, employee: null })
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee')
      console.error('Error deleting employee:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmModal({ show: false, employee: null })
  }

  // Custom Select Component
  const CustomSelect = ({ 
    value, 
    onChange, 
    options, 
    className = "",
    placeholder = "Select..."
  }: { 
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, 
    options: {value: string, label: string}[],
    className?: string,
    placeholder?: string
  }) => {
    return (
      <div className={`relative ${className}`}>
        <select
          value={value}
          onChange={onChange}
          className="appearance-none w-full px-4 py-2.5 bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all pr-10"
        >
          <option value="" className="bg-[#1C1C1C] text-[#f7eccf]">{placeholder}</option>
          {options.map(option => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-[#1C1C1C] text-[#f7eccf] py-2"
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/70">
          <ChevronDown size={16} />
        </div>
      </div>
    )
  }

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-500/20 text-green-500', icon: <CheckCircle size={14} />, text: 'Active' }
      case 'inactive':
        return { color: 'bg-red-500/20 text-red-500', icon: <XCircle size={14} />, text: 'Inactive' }
      case 'on_leave':
        return { color: 'bg-amber-500/20 text-amber-500', icon: <AlertCircle size={14} />, text: 'On Leave' }
      default:
        return { color: 'bg-gray-500/20 text-gray-500', icon: <AlertCircle size={14} />, text: status }
    }
  }

  if (!isAdmin && !isManager) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-none bg-[#1C1C1C] rounded-3xl shadow-xl">
            <CardContent className="p-8 text-center">
              <Users size={48} className="mx-auto mb-4 text-[#f7eccf]/30" />
              <h2 className="text-lg font-medium text-[#f7eccf] mb-2">Access Denied</h2>
              <p className="text-[#f7eccf]/70">You don't have permission to view this page.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-[#f7eccf] flex items-center">
                    <Users className="h-6 w-6 mr-2 text-[#f7eccf]/70" />
                    Employees
                  </h1>
                  <p className="text-[#f7eccf]/70 mt-1">
                    Manage your team members and their information
                  </p>
                </div>
                
                {(isAdmin || isManager) && (
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      variant="accent"
                      onClick={() => {
                        resetForm()
                        setShowForm(!showForm)
                      }}
                      className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                    >
                      {showForm ? (
                        <>
                          <X size={16} />
                          <span>Cancel</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Add Employee</span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Filters */}
        <motion.div variants={itemVariants}>
          <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="relative rounded-full shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search size={16} className="text-[#f7eccf]/50" />
                    </div>
                    <input
                      type="search"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <CustomSelect
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'on_leave', label: 'On Leave' }
                    ]}
                    placeholder="Filter by Status"
                  />
                </div>

                {/* Department Filter */}
                <div>
                  <CustomSelect
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Departments' },
                      ...departments.map(dept => ({
                        value: dept.id.toString(),
                        label: dept.name
                      }))
                    ]}
                    placeholder="Filter by Department"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-[#f7eccf]/10">
                <span className="text-sm text-[#f7eccf]/70">Sort by:</span>
                <div className="flex gap-2">
                  {[
                    { value: 'first_name', label: 'First Name' },
                    { value: 'last_name', label: 'Last Name' },
                    { value: 'employee_id', label: 'Employee ID' },
                    { value: 'hire_date', label: 'Hire Date' }
                  ].map(option => (
                    <motion.button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                        sortBy === option.value
                          ? 'bg-[#f7eccf] text-[#1C1C1C]'
                          : 'bg-[#f7eccf]/10 text-[#f7eccf]/70 hover:bg-[#f7eccf]/20'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            variants={itemVariants}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-500 flex items-center"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmModal.show && (
            <>
              {/* Modal Backdrop */}
              <motion.div 
                className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={handleDeleteCancel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {/* Modal Content */}
                <motion.div 
                  className="bg-[#1C1C1C] rounded-3xl shadow-2xl p-8 w-full max-w-md border border-[#f7eccf]/20"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.65, 0.3, 0.9] }}
                >
                  <div className="text-center">
                    {/* Warning Icon */}
                    <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-6">
                      <AlertCircle size={32} className="text-red-500" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-3">
                      Delete Employee
                    </h3>
                    
                    {/* Message */}
                    <p className="text-[#f7eccf]/80 mb-2">
                      Are you sure you want to delete{' '}
                      <span className="font-semibold text-[#f7eccf]">
                        {deleteConfirmModal.employee?.first_name} {deleteConfirmModal.employee?.last_name}
                      </span>
                      ?
                    </p>
                    <p className="text-[#f7eccf]/60 text-sm mb-8">
                      This action cannot be undone and will permanently remove all employee data.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.div
                        className="flex-1"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          onClick={handleDeleteCancel}
                          variant="outline"
                          className="w-full border-[#f7eccf]/50 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-full px-6 py-3"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        className="flex-1"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          onClick={handleDeleteConfirm}
                          className="w-full bg-red-500 text-white hover:bg-red-600 rounded-full shadow-md px-6 py-3 flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          Delete Employee
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Employee Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              ref={formRef}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6 text-[#f7eccf] flex items-center">
                    {editingId ? (
                      <>
                        <Edit2 className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                        Edit Employee
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                        Add New Employee
                      </>
                    )}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Employee ID</label>
                        <input
                          type="text"
                          name="employee_id"
                          value={formData.employee_id}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Department</label>
                        <CustomSelect
                          value={formData.department_id === null ? '' : formData.department_id.toString()}
                          onChange={(e) => handleInputChange({ ...e, target: { ...e.target, name: 'department_id' } })}
                          options={departments.map(dept => ({
                            value: dept.id.toString(),
                            label: dept.name
                          }))}
                          placeholder="Select Department"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">First Name</label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Last Name</label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Position</label>
                        <CustomSelect
                          value={formData.position}
                          onChange={(e) => handleInputChange({ ...e, target: { ...e.target, name: 'position' } })}
                          options={positionOptions.map(pos => ({
                            value: pos,
                            label: pos
                          }))}
                          placeholder="Select Position"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Status</label>
                        <CustomSelect
                          value={formData.status}
                          onChange={(e) => handleInputChange({ ...e, target: { ...e.target, name: 'status' } })}
                          options={[
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                            { value: 'on_leave', label: 'On Leave' }
                          ]}
                          placeholder="Select Status"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Hire Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            name="hire_date"
                            value={formData.hire_date}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/70">
                            <Calendar size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <motion.div
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#f7eccf]/50 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-full px-5 py-2.5"
                          onClick={() => {
                            resetForm()
                            setShowForm(false)
                          }}
                        >
                          Cancel
                        </Button>
                      </motion.div>
                      <motion.div
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button 
                          type="submit" 
                          className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full shadow-md px-5 py-2.5"
                        >
                          {editingId ? 'Update Employee' : 'Add Employee'}
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employees List */}
        {loading ? (
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div 
              className="w-12 h-12 rounded-full border-2 border-[#f7eccf] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="mt-4 text-[#f7eccf]/70">Loading employees...</p>
          </motion.div>
        ) : filteredAndSortedEmployees.length > 0 ? (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAndSortedEmployees.map(employee => (
              <motion.div
                key={employee.id}
                variants={cardVariants}
                whileHover="hover"
              >
                <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl h-full">
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      {/* Employee Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f7eccf] to-[#e9d8ae] flex items-center justify-center text-[#1C1C1C] font-bold text-lg mr-3">
                            {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#f7eccf]">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-sm text-[#f7eccf]/70 flex items-center">
                              <Badge size={12} className="mr-1" />
                              {employee.employee_id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {(() => {
                            const status = getStatusDisplay(employee.status)
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${status.color}`}>
                                {status.icon}
                                {status.text}
                              </span>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Employee Details */}
                      <div className="space-y-3 flex-grow">
                        {employee.position && (
                          <div className="flex items-center text-[#f7eccf]/80">
                            <User size={14} className="mr-2 text-[#f7eccf]/50" />
                            <span className="text-sm">{employee.position}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-[#f7eccf]/80">
                          <Building size={14} className="mr-2 text-[#f7eccf]/50" />
                          <span className="text-sm">{getDepartmentName(employee.department_id)}</span>
                        </div>
                        
                        {employee.email && (
                          <div className="flex items-center text-[#f7eccf]/80">
                            <Mail size={14} className="mr-2 text-[#f7eccf]/50" />
                            <span className="text-sm truncate">{employee.email}</span>
                          </div>
                        )}
                        
                        {employee.phone && (
                          <div className="flex items-center text-[#f7eccf]/80">
                            <Phone size={14} className="mr-2 text-[#f7eccf]/50" />
                            <span className="text-sm">{employee.phone}</span>
                          </div>
                        )}
                        
                        {employee.hire_date && (
                          <div className="flex items-center text-[#f7eccf]/80">
                            <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                            <span className="text-sm">
                              Hired: {new Date(employee.hire_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 mt-4 pt-4 border-t border-[#f7eccf]/10">
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-[#f7eccf]/50 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-full flex items-center justify-center gap-1"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit2 size={14} />
                            Edit
                          </Button>
                        </motion.div>
                        
                        {isAdmin && (
                          <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            className="flex-1"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-full flex items-center justify-center gap-1"
                              onClick={() => handleDeleteClick(employee)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center justify-center py-16"
          >
            <Card className="border-none bg-[#1C1C1C] rounded-3xl shadow-xl">
              <CardContent className="p-12 text-center">
                <Users size={48} className="mx-auto mb-4 text-[#f7eccf]/30" />
                <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No employees found</h3>
                <p className="text-[#f7eccf]/70">
                  {searchTerm || filterStatus !== 'all' || filterDepartment !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'No employees have been added yet'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}