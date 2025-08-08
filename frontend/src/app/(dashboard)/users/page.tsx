'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { permanentDeleteUser } from '@/services/users'
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
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Crown,
  Star
} from 'lucide-react'

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
  const formRef = useRef<HTMLDivElement>(null)
  const [showInactive, setShowInactive] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<string>('username')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterUserType, setFilterUserType] = useState<string>('all')
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean, 
    user: User | null, 
    type: 'deactivate' | 'permanent'
  }>({ show: false, user: null, type: 'deactivate' })
  
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    user_type: 'staff',
    employee_id: null,
    department_id: null,
    role: 'staff',
    is_active: true
  })

  const roleOptions = ['admin', 'manager', 'lead', 'staff']

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return
      
      try {
        setLoading(true)
        setError(null)
        
        const usersResponse = await api.get('/auth/users', {
          params: { include_inactive: true }
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

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      if (!showInactive && !user.is_active) return false
      
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = searchTerm === '' || (
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
      
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesUserType = filterUserType === 'all' || user.user_type === filterUserType
      
      return matchesSearch && matchesRole && matchesUserType
    })
    .sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'username':
          aVal = a.username || ''
          bVal = b.username || ''
          break
        case 'role':
          aVal = a.role || ''
          bVal = b.role || ''
          break
        case 'user_type':
          aVal = a.user_type || ''
          bVal = b.user_type || ''
          break
        default:
          aVal = a.username || ''
          bVal = b.username || ''
      }
      
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal)
      } else {
        return bVal.localeCompare(aVal)
      }
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
        params: { include_inactive: true }
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

  const handleDeleteClick = (user: User, type: 'deactivate' | 'permanent') => {
    setDeleteConfirmModal({ show: true, user, type })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.user) return
    
    try {
      setLoading(true)
      setError(null)
      
      if (deleteConfirmModal.type === 'permanent') {
        // First update the user to remove dependencies
        try {
          await api.put(`/auth/users/${deleteConfirmModal.user.id}`, {
            employee_id: null,
            department_id: null
          })
        } catch (err) {
          console.error("Error removing user dependencies:", err)
        }
        
        await permanentDeleteUser(deleteConfirmModal.user.id)
        setUsers(prev => prev.filter(user => user.id !== deleteConfirmModal.user!.id))
      } else {
        // Soft delete (deactivate)
        await api.delete(`/auth/users/${deleteConfirmModal.user.id}`)
        setUsers(prev => prev.map(user => 
          user.id === deleteConfirmModal.user!.id ? { ...user, is_active: false } : user
        ))
      }
      
      setDeleteConfirmModal({ show: false, user: null, type: 'deactivate' })
      
    } catch (err: any) {
      setError(err.message || `Failed to ${deleteConfirmModal.type === 'permanent' ? 'permanently delete' : 'deactivate'} user`)
    } finally {
      setLoading(false)
    }
  }

  // Updated CustomSelect Component with name prop
  const CustomSelect = ({ 
    name,
    value, 
    onChange, 
    options, 
    className = "",
    placeholder = "Select..."
  }: { 
    name: string,
    value: string, 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, 
    options: {value: string, label: string}[],
    className?: string,
    placeholder?: string
  }) => {
    return (
      <div className={`relative ${className}`}>
        <select
          name={name}
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

  // Get role icon and color
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return { icon: <Crown size={14} />, color: 'bg-red-500/20 text-red-500', text: 'Admin' }
      case 'manager':
        return { icon: <Star size={14} />, color: 'bg-purple-500/20 text-purple-500', text: 'Manager' }
      case 'lead':
        return { icon: <UserCheck size={14} />, color: 'bg-blue-500/20 text-blue-500', text: 'Lead' }
      case 'staff':
        return { icon: <User size={14} />, color: 'bg-green-500/20 text-green-500', text: 'Staff' }
      default:
        return { icon: <User size={14} />, color: 'bg-gray-500/20 text-gray-500', text: role }
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-none bg-[#1C1C1C] rounded-3xl shadow-xl">
            <CardContent className="p-12 text-center">
              <Shield size={48} className="mx-auto mb-4 text-[#f7eccf]/30" />
              <h2 className="text-xl font-semibold text-[#f7eccf] mb-2">Access Denied</h2>
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
                    User Management
                  </h1>
                  <p className="text-[#f7eccf]/70 mt-1">
                    Manage user accounts and their access permissions
                  </p>
                </div>
                
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
                        <span>Add User</span>
                      </>
                    )}
                  </Button>
                </motion.div>
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
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <div>
                  <CustomSelect
                    name="filterRole"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Roles' },
                      ...roleOptions.map(role => ({
                        value: role,
                        label: role.charAt(0).toUpperCase() + role.slice(1)
                      }))
                    ]}
                    placeholder="Filter by Role"
                  />
                </div>

                {/* User Type Filter */}
                <div>
                  <CustomSelect
                    name="filterUserType"
                    value={filterUserType}
                    onChange={(e) => setFilterUserType(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'staff', label: 'Staff' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'admin', label: 'Admin' }
                    ]}
                    placeholder="Filter by Type"
                  />
                </div>
              </div>

              {/* Sort Options and Show Inactive Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[#f7eccf]/10">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#f7eccf]/70">Sort by:</span>
                  <div className="flex gap-2">
                    {[
                      { value: 'username', label: 'Username' },
                      { value: 'role', label: 'Role' },
                      { value: 'user_type', label: 'Type' }
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

                {/* Show Inactive Toggle */}
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setShowInactive(!showInactive)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      showInactive
                        ? 'bg-[#f7eccf] text-[#1C1C1C]'
                        : 'bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
                    Show Inactive Users
                  </motion.button>
                </div>
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
                onClick={() => setDeleteConfirmModal({ show: false, user: null, type: 'deactivate' })}
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
                      {deleteConfirmModal.type === 'permanent' ? (
                        <Trash2 size={32} className="text-red-500" />
                      ) : (
                        <UserX size={32} className="text-amber-500" />
                      )}
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-3">
                      {deleteConfirmModal.type === 'permanent' ? 'Permanently Delete User' : 'Deactivate User'}
                    </h3>
                    
                    {/* Message */}
                    <p className="text-[#f7eccf]/80 mb-2">
                      Are you sure you want to {deleteConfirmModal.type === 'permanent' ? 'permanently delete' : 'deactivate'}{' '}
                      <span className="font-semibold text-[#f7eccf]">
                        {deleteConfirmModal.user?.username}
                      </span>
                      ?
                    </p>
                    <p className="text-[#f7eccf]/60 text-sm mb-8">
                      {deleteConfirmModal.type === 'permanent' 
                        ? 'This action cannot be undone and will remove all user data permanently.'
                        : 'This will disable the user account but keep all data intact.'}
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
                          onClick={() => setDeleteConfirmModal({ show: false, user: null, type: 'deactivate' })}
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
                          className={`w-full ${
                            deleteConfirmModal.type === 'permanent' 
                              ? 'bg-red-500 hover:bg-red-600' 
                              : 'bg-amber-500 hover:bg-amber-600'
                          } text-white rounded-full shadow-md px-6 py-3 flex items-center justify-center gap-2`}
                        >
                          {deleteConfirmModal.type === 'permanent' ? (
                            <>
                              <Trash2 size={16} />
                              Delete Permanently
                            </>
                          ) : (
                            <>
                              <UserX size={16} />
                              Deactivate User
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* User Form */}
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
                        Edit User
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                        Create New User
                      </>
                    )}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Username</label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">
                          Password {editingId && '(leave blank to keep current)'}
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                          required={!editingId}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Role</label>
                        <CustomSelect
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          options={roleOptions.map(role => ({
                            value: role,
                            label: role.charAt(0).toUpperCase() + role.slice(1)
                          }))}
                          placeholder="Select Role"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">User Type</label>
                        <CustomSelect
                          name="user_type"
                          value={formData.user_type}
                          onChange={handleInputChange}
                          options={[
                            { value: 'staff', label: 'Staff' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'admin', label: 'Admin' }
                          ]}
                          placeholder="Select User Type"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Linked Employee</label>
                        <CustomSelect
                          name="employee_id"
                          value={formData.employee_id === null ? '' : formData.employee_id.toString()}
                          onChange={handleInputChange}
                          options={employees.map(emp => ({
                            value: emp.id.toString(),
                            label: `${emp.first_name} ${emp.last_name} (${emp.employee_id})`
                          }))}
                          placeholder="Select Employee"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Department</label>
                        <CustomSelect
                          name="department_id"
                          value={formData.department_id === null ? '' : formData.department_id.toString()}
                          onChange={handleInputChange}
                          options={departments.map(dept => ({
                            value: dept.id.toString(),
                            label: dept.name
                          }))}
                          placeholder="Select Department"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Status</label>
                        <CustomSelect
                          name="is_active"
                          value={formData.is_active.toString()}
                          onChange={handleInputChange}
                          options={[
                            { value: 'true', label: 'Active' },
                            { value: 'false', label: 'Inactive' }
                          ]}
                          placeholder="Select Status"
                        />
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
                          {editingId ? 'Update User' : 'Create User'}
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users List */}
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
            <p className="mt-4 text-[#f7eccf]/70">Loading users...</p>
          </motion.div>
        ) : filteredAndSortedUsers.length > 0 ? (
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAndSortedUsers.map(user => (
              <motion.div
                key={user.id}
                variants={cardVariants}
                whileHover="hover"
              >
                <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl h-full">
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      {/* User Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f7eccf] to-[#e9d8ae] flex items-center justify-center text-[#1C1C1C] font-bold text-lg mr-3">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#f7eccf]">
                              {user.username}
                            </h3>
                            <p className="text-sm text-[#f7eccf]/70 capitalize">
                              {user.user_type}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                            user.is_active 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {user.is_active ? (
                              <>
                                <CheckCircle size={12} />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle size={12} />
                                Inactive
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* User Details */}
                      <div className="space-y-3 flex-grow">
                        <div className="flex items-center justify-between">
                          <span className="text-[#f7eccf]/70 text-sm">Role</span>
                          {(() => {
                            const roleDisplay = getRoleDisplay(user.role)
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${roleDisplay.color}`}>
                                {roleDisplay.icon}
                                {roleDisplay.text}
                              </span>
                            )
                          })()}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[#f7eccf]/70 text-sm flex items-center">
                            <User size={14} className="mr-1" />
                            Employee
                          </span>
                          <span className="text-[#f7eccf] text-sm font-medium">
                            {getEmployeeName(user.employee_id)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[#f7eccf]/70 text-sm flex items-center">
                            <Building size={14} className="mr-1" />
                            Department
                          </span>
                          <span className="text-[#f7eccf] text-sm font-medium">
                            {getDepartmentName(user.department_id)}
                          </span>
                        </div>
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
                            onClick={() => handleEdit(user)}
                          >
                            <Edit2 size={14} />
                            Edit
                          </Button>
                        </motion.div>
                        
                        {currentUser && user.id !== currentUser.id && (
                          <>
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              className="flex-1"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10 rounded-full flex items-center justify-center gap-1"
                                onClick={() => handleDeleteClick(user, 'deactivate')}
                                title="Deactivate user (keeps record in database)"
                              >
                                <UserX size={14} />
                                Deactivate
                              </Button>
                            </motion.div>
                            
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
                                onClick={() => handleDeleteClick(user, 'permanent')}
                                title="Permanently delete user from database"
                              >
                                <Trash2 size={14} />
                                Delete
                              </Button>
                            </motion.div>
                          </>
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
                <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No users found</h3>
                <p className="text-[#f7eccf]/70">
                  {searchTerm || filterRole !== 'all' || filterUserType !== 'all'
                    ? showInactive 
                      ? "No users found matching your search criteria." 
                      : "No active users found. Try enabling 'Show Inactive Users' to see all users."
                    : "No users have been created yet"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}