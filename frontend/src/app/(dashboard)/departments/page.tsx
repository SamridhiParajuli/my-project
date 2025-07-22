// app/(dashboard)/departments/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { 
  Building, 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  CheckCircle, 
  XCircle, 
  ArrowUpDown,
  Filter,
  X,
  AlertTriangle,
  Search
} from 'lucide-react'

// Animation variants
const containerVariants:Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const itemVariants:Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const formVariants:Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: { duration: 0.3 }
  }
}

const modalVariants:Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 }
  }
}

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
  const formData = useRef<DepartmentFormData>({
    name: '',
    department_code: '',
    description: '',
    manager_id: null,
    is_active: true
  })
  
  // New states for sorting, filtering and modal
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showInactive, setShowInactive] = useState<boolean>(false)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [deleteModal, setDeleteModal] = useState<{open: boolean, id: number | null}>({
    open: false,
    id: null
  })
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

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
        
      } catch (err) {
        setError('Failed to load departments')
        console.error('Error fetching department data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (isAdmin || isManager) {
      fetchData()
    }
  }, [isAdmin, isManager])

  // Sort and filter departments
  const filteredAndSortedDepartments = departments
    .filter(dept => {
      // Filter by search term
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        dept.name.toLowerCase().includes(searchLower) ||
        (dept.department_code && dept.department_code.toLowerCase().includes(searchLower)) ||
        (dept.description && dept.description.toLowerCase().includes(searchLower))
      )
      
      // Filter by active status
      const matchesStatus = showInactive ? true : dept.is_active
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      // Handle different column sorts
      let valueA, valueB;
      
      switch (sortColumn) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'code':
          valueA = (a.department_code || '').toLowerCase();
          valueB = (b.department_code || '').toLowerCase();
          break;
        case 'status':
          valueA = a.is_active ? 'active' : 'inactive';
          valueB = b.is_active ? 'active' : 'inactive';
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Get manager name
  const getManagerName = (managerId:any) => {
    if (!managerId) return 'Not Assigned'
    const manager = employees.find(emp => emp.id === managerId)
    return manager ? `${manager.first_name} ${manager.last_name}` : `Manager ID: ${managerId}`
  }

  // Handle form input changes
  const handleInputChange = (e:any) => {
    const { name, value } = e.target
    formData.current = {
      ...formData.current,
      [name]: name === 'manager_id' ? (value ? parseInt(value) : null) : 
              name === 'is_active' ? value === 'true' : 
              value
    }
  }

  // Reset form
  const resetForm = () => {
    formData.current = {
      name: '',
      department_code: '',
      description: '',
      manager_id: null,
      is_active: true
    }
    setEditingId(null)
    setShowForm(false)
  }

  // Load department data for editing
  const handleEdit = (department:any) => {
    // First close any existing form
    setShowForm(false)
    
    // After a brief timeout, set up and show the new form
    setTimeout(() => {
      formData.current = {
        name: department.name,
        department_code: department.department_code || '',
        description: department.description || '',
        manager_id: department.manager_id,
        is_active: department.is_active
      }
      setEditingId(department.id)
      setShowForm(true)
    }, 100)
  }

  // Handle form submission
  const handleSubmit = async (e:any) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      if (editingId) {
        // Update existing department
        await api.put(`/departments/${editingId}`, formData.current)
      } else {
        // Create new department
        await api.post('/departments', formData.current)
      }
      
      // Refresh department list
      const response = await api.get('/departments')
      if (response.data && response.data.items) {
        setDepartments(response.data.items)
      }
      
      // Reset form and close it
      resetForm()
      
    } catch (err) {
      setError( 'Failed to save department')
      console.error('Error saving department:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open delete confirmation modal
  const openDeleteModal = (id:any) => {
    setDeleteModal({
      open: true,
      id
    })
  }

  // Handle department deletion
  const handleDelete = async () => {
    if (!deleteModal.id) return
    
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/departments/${deleteModal.id}`)
      
      // Remove from local state
      setDepartments(prev => prev.filter(dept => dept.id !== deleteModal.id))
      
      // Close the modal
      setDeleteModal({open: false, id: null})
      
    } catch (err) {
      setError('Failed to delete department')
      console.error('Error deleting department:', err)
    } finally {
      setLoading(false)
    }
  }

  // Toggle sort direction or change sort column
  const handleSort = (column:any) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Render department card for mobile view
  const renderDepartmentCard = (department:any, index:any) => (
    <motion.div 
      key={department.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { delay: index * 0.05, duration: 0.3 }
      }}
      className="bg-[#1C1C1C] rounded-3xl p-4 shadow-lg mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="p-2 mr-3 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf]">
            <Building size={16} />
          </div>
          <span className="font-medium text-[#f7eccf]">{department.name}</span>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          department.is_active 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {department.is_active ? (
            <>
              <CheckCircle size={12} className="mr-1" />
              Active
            </>
          ) : (
            <>
              <XCircle size={12} className="mr-1" />
              Inactive
            </>
          )}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <span className="text-xs text-[#f7eccf]/50">Code</span>
          <p className="text-sm text-[#f7eccf]/80">{department.department_code || '—'}</p>
        </div>
        <div>
          <span className="text-xs text-[#f7eccf]/50">Manager</span>
          <p className="text-sm text-[#f7eccf]/80">{getManagerName(department.manager_id)}</p>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-2">
        <motion.button
          className="p-2 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-colors"
          onClick={() => handleEdit(department)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Pencil size={16} />
        </motion.button>
        
        {isAdmin && (
          <motion.button
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            onClick={() => openDeleteModal(department.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Trash2 size={16} />
          </motion.button>
        )}
      </div>
      
      {/* Edit form that appears under this card when editing */}
      <AnimatePresence>
        {showForm && editingId === department.id && (
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden mt-4 border-t border-[#f7eccf]/10 pt-4"
          >
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={formData.current.name}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Code</label>
                  <input
                    type="text"
                    name="department_code"
                    defaultValue={formData.current.department_code}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Description</label>
                  <textarea
                    name="description"
                    defaultValue={formData.current.description}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all h-24 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Manager</label>
                  <div className="relative">
                    <select
                      name="manager_id"
                      defaultValue={formData.current.manager_id || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all appearance-none"
                    >
                      <option value="">Select Manager</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#f7eccf]/70">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Status</label>
                  <div className="relative">
                    <select
                      name="is_active"
                      defaultValue={formData.current.is_active.toString()}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all appearance-none"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#f7eccf]/70">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <motion.button
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium"
                    onClick={resetForm}
                    whileHover={{ scale: 1.03, backgroundColor: "rgba(247, 236, 207, 0.2)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button 
                    type="submit" 
                    className="px-4 py-2.5 rounded-xl bg-[#f7eccf] text-[#1C1C1C] font-medium shadow-lg"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Update Department
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  // Access denied view
  if (!isAdmin && !isManager) {
    return (
      <motion.div 
        className="p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-[#f7eccf]/10">
              <XCircle size={32} className="text-[#f7eccf]" />
            </div>
            <h2 className="text-xl font-semibold text-[#f7eccf] mb-2">Access Denied</h2>
            <p className="text-[#f7eccf]/70">You don't have permission to view this page.</p>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Generate background pattern SVG
  const backgroundPattern = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1C1C1C" stroke-width="0.5" opacity="0.05"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#smallGrid)" />
    </svg>
  `;

  return (
    <div className="relative min-h-screen">
      {/* Background pattern */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-30" 
        dangerouslySetInnerHTML={{ __html: backgroundPattern }}
      />
      
      <motion.div 
        className="p-4 md:p-6 space-y-6 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header and controls */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          variants={itemVariants}
        >
          <div className="flex items-center">
            <div className="p-3 mr-4 rounded-2xl bg-[#1C1C1C] shadow-lg">
              <Building size={24} className="text-[#f7eccf]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1C1C1C]">Departments</h1>
              <p className="text-sm text-[#1C1C1C]/70">Manage your store departments</p>
            </div>
          </div>
        </motion.div>
        
        {/* Search and filters section - Enhanced */}
        <motion.div 
          className="bg-[#1C1C1C] rounded-3xl shadow-xl p-4 md:p-6"
          variants={itemVariants}
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search bar - More prominent */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={20} className="text-[#f7eccf]/70" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search departments by name, code or description..."
                className="w-full pl-12 pr-4 py-3.5 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:ring-2 focus:ring-[#f7eccf] transition-all shadow-inner text-base"
              />
              {searchTerm && (
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#f7eccf]/70 hover:text-[#f7eccf]"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* Add department button */}
            {isAdmin && !showForm && (
              <motion.button
                className="px-4 py-3.5 rounded-xl bg-[#f7eccf] text-[#1C1C1C] shadow-lg flex items-center justify-center gap-2 font-medium min-w-[180px]"
                onClick={() => {
                  resetForm()
                  setEditingId(null)
                  setShowForm(true)
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus size={18} />
                <span>Add Department</span>
              </motion.button>
            )}
          </div>
          
          {/* Filters section */}
          <div className="flex flex-wrap gap-4 items-center mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#f7eccf]/80">Show inactive:</span>
              <div className="relative inline-block">
                <input
                  type="checkbox"
                  id="showInactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${showInactive ? 'bg-[#f7eccf]' : 'bg-[#f7eccf]/30'}`}>
                  <div className={`absolute w-4 h-4 rounded-full transition-transform bg-[#1C1C1C] transform ${showInactive ? 'translate-x-5' : 'translate-x-1'} top-0.5`}></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#f7eccf]/80">Sort by:</span>
              <select
                value={sortColumn}
                onChange={(e) => handleSort(e.target.value)}
                className="p-1.5 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] text-sm border-none shadow-inner"
              >
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="status">Status</option>
              </select>
              
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] shadow-inner"
              >
                <ArrowUpDown size={16} className={sortDirection === 'desc' ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Top level form for adding a new department */}
        <AnimatePresence>
          {showForm && !editingId && (
            <motion.div
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <Card className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden">
                <div className="p-4 md:p-6">
                  <h2 className="text-xl font-semibold text-[#f7eccf] mb-6 flex items-center">
                    <Plus size={18} className="mr-2 text-[#f7eccf]/70" />
                    Add New Department
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Name</label>
                        <input
                          type="text"
                          name="name"
                          defaultValue={formData.current.name}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Code</label>
                        <input
                          type="text"
                          name="department_code"
                          defaultValue={formData.current.department_code}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Description</label>
                        <textarea
                          name="description"
                          defaultValue={formData.current.description}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all h-24 resize-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Manager</label>
                        <div className="relative">
                          <select
                            name="manager_id"
                            defaultValue={formData.current.manager_id || ''}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all appearance-none"
                          >
                            <option value="">Select Manager</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#f7eccf]/70">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Status</label>
                        <div className="relative">
                          <select
                            name="is_active"
                            defaultValue={formData.current.is_active.toString()}
                            onChange={handleInputChange}
                            className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all appearance-none"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#f7eccf]/70">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <motion.button
                        type="button"
                        className="px-4 py-2.5 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium"
                        onClick={resetForm}
                        whileHover={{ scale: 1.03, backgroundColor: "rgba(247, 236, 207, 0.2)" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button 
                        type="submit" 
                        className="px-4 py-2.5 rounded-xl bg-[#f7eccf] text-[#1C1C1C] font-medium shadow-lg"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Add Department
                      </motion.button>
                    </div>
                  </form>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error message */}
        {error && (
          <motion.div 
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p>{error}</p>
          </motion.div>
        )}
        
        {/* Departments list */}
        {loading ? (
          <motion.div 
            className="flex justify-center items-center py-12"
            variants={itemVariants}
          >
            <div className="w-12 h-12 rounded-full border-4 border-[#1C1C1C]/20 border-t-[#1C1C1C] animate-spin"></div>
          </motion.div>
        ) : filteredAndSortedDepartments.length > 0 ? (
          <motion.div variants={itemVariants}>
            {/* Mobile view */}
            {isMobile && (
              <div className="space-y-4">
                {filteredAndSortedDepartments.map((department, index) => 
                  renderDepartmentCard(department, index)
                )}
              </div>
            )}
            
            {/* Desktop view */}
            {!isMobile && (
              <div className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#f7eccf]/10">
                    <thead>
                      <tr className="bg-[#f7eccf]/5">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#f7eccf]/70">
                          <button 
                            className="flex items-center gap-1 hover:text-[#f7eccf] transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            Name
                            {sortColumn === 'name' && (
                              <ArrowUpDown size={14} className={`transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#f7eccf]/70">
                          <button 
                            className="flex items-center gap-1 hover:text-[#f7eccf] transition-colors"
                            onClick={() => handleSort('code')}
                          >
                            Code
                            {sortColumn === 'code' && (
                              <ArrowUpDown size={14} className={`transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#f7eccf]/70">
                          Manager
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#f7eccf]/70">
                          <button 
                            className="flex items-center gap-1 hover:text-[#f7eccf] transition-colors"
                            onClick={() => handleSort('status')}
                          >
                            Status
                            {sortColumn === 'status' && (
                              <ArrowUpDown size={14} className={`transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#f7eccf]/70">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7eccf]/10">
                      {filteredAndSortedDepartments.map((department, index) => (
                        <React.Fragment key={department.id}>
                          <motion.tr 
                            className={`hover:bg-[#f7eccf]/5 transition-colors ${editingId === department.id ? 'bg-[#f7eccf]/5' : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0,
                              transition: { delay: index * 0.05, duration: 0.3 }
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="p-2 mr-3 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf]">
                                  <Building size={16} />
                                </div>
                                <div className="font-medium text-[#f7eccf]">{department.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[#f7eccf]/70">
                              {department.department_code || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[#f7eccf]/70">
                              {getManagerName(department.manager_id)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                department.is_active 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {department.is_active ? (
                                  <>
                                    <CheckCircle size={12} className="mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={12} className="mr-1" />
                                    Inactive
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <motion.button
                                  className="p-2 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-colors"
                                  onClick={() => handleEdit(department)}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Pencil size={16} />
                                </motion.button>
                                
                                {isAdmin && (
                                  <motion.button
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                    onClick={() => openDeleteModal(department.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                          
                          {/* Edit form that appears beneath the row */}
                          {showForm && editingId === department.id && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ 
                                opacity: 1, 
                                height: 'auto',
                                transition: { duration: 0.3 }
                              }}
                              exit={{ 
                                opacity: 0, 
                                height: 0,
                                transition: { duration: 0.2 }
                              }}
                            >
                              <td colSpan={5} className="bg-[#f7eccf]/5">
                                <div className="p-6">
                                  <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div>
                                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Name</label>
                                        <input
                                          type="text"
                                          name="name"
                                          defaultValue={formData.current.name}
                                          onChange={handleInputChange}
                                          className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all"
                                          required
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Code</label>
                                        <input
                                          type="text"
                                          name="department_code"
                                          defaultValue={formData.current.department_code}
                                          onChange={handleInputChange}
                                          className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all"
                                        />
                                      </div>
                                      
                                      <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Description</label>
                                        <textarea
                                          name="description"
                                          defaultValue={formData.current.description}
                                          onChange={handleInputChange}
                                          className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all h-24 resize-none"
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department Manager</label>
                                        <div className="relative">
                                          <select
                                            name="manager_id"
                                            defaultValue={formData.current.manager_id || ''}
                                            onChange={handleInputChange}
                                            className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all appearance-none"
                                          >
                                            <option value="">Select Manager</option>
                                            {employees.map(emp => (
                                              <option key={emp.id} value={emp.id}>
                                                {emp.first_name} {emp.last_name}
                                              </option>
                                            ))}
                                          </select>
                                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#f7eccf]/70">
                                            <ChevronDown size={16} />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Status</label>
                                        <div className="relative">
                                          <select
                                            name="is_active"
                                            defaultValue={formData.current.is_active.toString()}
                                            onChange={handleInputChange}
                                            className="w-full p-3 bg-[#f7eccf]/10 border-none rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf] transition-all appearance-none"
                                          >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                          </select>
                                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-[#f7eccf]/70">
                                            <ChevronDown size={16} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-3">
                                      <motion.button
                                        type="button"
                                        className="px-4 py-2.5 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium"
                                        onClick={resetForm}
                                        whileHover={{ scale: 1.03, backgroundColor: "rgba(247, 236, 207, 0.2)" }}
                                        whileTap={{ scale: 0.97 }}
                                      >
                                        Cancel
                                      </motion.button>
                                      <motion.button 
                                        type="submit" 
                                        className="px-4 py-2.5 rounded-xl bg-[#f7eccf] text-[#1C1C1C] font-medium shadow-lg"
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                      >
                                        Update Department
                                      </motion.button>
                                    </div>
                                  </form>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden"
            variants={itemVariants}
          >
            <div className="p-12 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                  <Building size={32} className="text-[#f7eccf]/50" />
                </div>
                <h3 className="text-lg font-medium text-[#f7eccf] mb-2">No departments found</h3>
                <p className="text-[#f7eccf]/70 max-w-md mx-auto">
                  {searchTerm ? 
                    `No departments match your search for "${searchTerm}"` : 
                    'Get started by adding your first department'}
                </p>
                
                {searchTerm && (
                  <motion.button
                    className="mt-4 px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] rounded-xl font-medium"
                    onClick={() => setSearchTerm('')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Clear Search
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteModal.open && (
          <>
            <motion.div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModal({open: false, id: null})}
            />
            
            <motion.div 
              className="fixed top-1/2 left-1/3  bg-[#1C1C1C] rounded-3xl shadow-2xl p-6 z-50 w-full max-w-md"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-start mb-4">
                <div className="bg-red-500/20 p-3 rounded-2xl mr-4">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">Delete Department</h3>
                  <p className="text-[#f7eccf]/70">
                    Are you sure you want to delete this department? This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  className="px-4 py-2.5 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium"
                  onClick={() => setDeleteModal({open: false, id: null})}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(247, 236, 207, 0.2)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
                <motion.button 
                  className="px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium shadow-lg"
                  onClick={handleDelete}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}