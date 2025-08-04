// app/(dashboard)/complaints/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { SearchBar } from '@/components/ui/SearchBar'
import { 
  AlertCircle, Trash2, AlertTriangle, MessageSquare, 
  Filter, ChevronDown, Users, Clock, Calendar, 
  CheckCircle, XCircle, Plus, RefreshCw, ChevronRight,
  Lock, Unlock, UserCheck
} from 'lucide-react'
import { motion, AnimatePresence, Variants, Transition } from 'framer-motion'

interface Complaint {
  id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  complaint_type: string
  description: string
  department_involved: number | null
  department_involved_name?: string
  reported_by: number
  reported_by_name?: string
  assigned_to: number | null
  assigned_to_name?: string
  severity: string
  status: string
  resolution: string | null
  is_private: boolean
  created_at: string
  resolved_at: string | null
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  department_id: number
  position: string
}

interface Department {
  id: number
  name: string
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const cardVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  hover: {
    y: -8,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.3 }
  }
}

const modalVariants: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.8
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.8,
    transition: { 
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1]
    }
  }
}

export default function ComplaintsPage() {
  const { user, isAdmin, isManager } = useAuth()
  const router = useRouter()

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('open')
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [resolution, setResolution] = useState<string>('')
  const [showResolutionForm, setShowResolutionForm] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('created_at')
  const [showAssignDropdown, setShowAssignDropdown] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    complaint_type: 'product_quality',
    description: '',
    department_involved: user?.department_id || null,
    severity: 'medium',
    status: 'open',
    resolution: '',
    is_private: false,
    assigned_to: null
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch departments for the dropdown
        const deptsResponse = await api.get('/departments')
        if (deptsResponse.data && deptsResponse.data.items) {
          setDepartments(deptsResponse.data.items)
        }

        // Fetch employees for assignment
        const empsResponse = await api.get('/employees', { 
          params: { 
            status: 'active',
            ...(user?.department_id && !isAdmin ? { department_id: user.department_id } : {})
          } 
        })
        
        if (empsResponse.data && empsResponse.data.items) {
          setEmployees(empsResponse.data.items)
        }

        // Fetch complaints with appropriate filtering
        let endpoint = '/complaints';
        const params: any = {
          ...(activeTab !== 'all' ? { status: activeTab } : {})
        }

        // If user is not admin and has department, fetch department complaints
        if (!isAdmin && user?.department_id) {
          endpoint = `/complaints/department/${user.department_id}`;
        }

        const response = await api.get(endpoint, { params })

        if (response.data && response.data.items) {
          setComplaints(response.data.items)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching complaints:', err)
        setError(err.response?.data?.detail || 'Failed to load complaints')
        setLoading(false)
      }
    }

    fetchData()
  }, [user, activeTab, isAdmin, isManager])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else if (name === 'department_involved' || name === 'assigned_to') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCreateComplaint = async () => {
    try {
      if (!formData.customer_name || !formData.description || !formData.complaint_type) {
        setError('Customer name, description and complaint type are required')
        return
      }
      
      // If high severity, automatically mark as private
      const updatedFormData = {
        ...formData,
        is_private: formData.severity === 'high' ? true : formData.is_private
      }
      
      const payload = {
        ...updatedFormData,
        reported_by: user?.employee_id // Use employee_id not user id
      }
      
      await api.post('/complaints', payload)
      setShowForm(false)
      
      // Reset form
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        complaint_type: 'product_quality',
        description: '',
        department_involved: user?.department_id || null,
        severity: 'medium',
        status: 'open',
        resolution: '',
        is_private: false,
        assigned_to: null
      })
      
      // Refresh complaints list
      refreshComplaints()
      
      setError(null)
    } catch (err: any) {
      console.error('Error creating complaint:', err)
      setError(err.response?.data?.detail || 'Failed to create complaint')
    }
  }

  const refreshComplaints = async () => {
    try {
      // Fetch complaints with appropriate filtering
      let endpoint = '/complaints';
      const params: any = {
        ...(activeTab !== 'all' ? { status: activeTab } : {})
      }

      // If user is not admin and has department, fetch department complaints
      if (!isAdmin && user?.department_id) {
        endpoint = `/complaints/department/${user.department_id}`;
      }

      const response = await api.get(endpoint, { params })

      if (response.data && response.data.items) {
        setComplaints(response.data.items)
      }
    } catch (err: any) {
      console.error('Error refreshing complaints:', err)
    }
  }
  
  const updateComplaintStatus = async (complaintId: number, newStatus: string) => {
    try {
      // If resolving complaint and resolution is required, show resolution form
      if (newStatus === 'resolved') {
        setShowResolutionForm(complaintId)
        return
      }
      
      await api.patch(`/complaints/${complaintId}/status`, { status: newStatus })
      
      // Update complaint in the list
      setComplaints(prev => prev.map(c => 
        c.id === complaintId ? { ...c, status: newStatus } : c
      ))
    } catch (err: any) {
      console.error('Error updating complaint status:', err)
      setError(err.response?.data?.detail || 'Failed to update complaint status')
    }
  }

  const handleResolveWithComment = async (complaintId: number) => {
    try {
      if (!resolution.trim()) {
        setError('Resolution comment is required')
        return
      }
      
      // Update both status and resolution
      await api.put(`/complaints/${complaintId}`, { 
        status: 'resolved',
        resolution: resolution
      })
      
      // Update complaint in the list
      setComplaints(prev => prev.map(c => 
        c.id === complaintId ? { ...c, status: 'resolved', resolution: resolution } : c
      ))
      
      // Reset form and close it
      setResolution('')
      setShowResolutionForm(null)
      
    } catch (err: any) {
      console.error('Error resolving complaint:', err)
      setError(err.response?.data?.detail || 'Failed to resolve complaint')
    }
  }

  const deleteComplaint = async (complaintId: number) => {
    try {
      await api.delete(`/complaints/${complaintId}`)
      
      // Remove the complaint from the list
      setComplaints(prev => prev.filter(c => c.id !== complaintId))
      
      // Reset delete confirmation
      setDeleteConfirmId(null)
    } catch (err: any) {
      console.error('Error deleting complaint:', err)
      setError(err.response?.data?.detail || 'Failed to delete complaint')
    }
  }

  const assignComplaint = async (complaintId: number, employeeId: number) => {
    try {
      await api.patch(`/complaints/${complaintId}/assign`, { assigned_to: employeeId })
      
      // Refresh complaints to get updated assignment info
      refreshComplaints()
      setShowAssignDropdown(null)
    } catch (err: any) {
      console.error('Error assigning complaint:', err)
      setError(err.response?.data?.detail || 'Failed to assign complaint')
    }
  }

  const togglePrivacy = async (complaintId: number, isPrivate: boolean) => {
    try {
      await api.patch(`/complaints/${complaintId}/privacy`, { is_private: isPrivate })
      
      // Update complaint in the list
      setComplaints(prev => prev.map(c => 
        c.id === complaintId ? { ...c, is_private: isPrivate } : c
      ))
    } catch (err: any) {
      console.error('Error updating complaint privacy:', err)
      setError(err.response?.data?.detail || 'Failed to update complaint privacy')
    }
  }

  const filteredComplaints = complaints.filter(complaint => 
    complaint.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (complaint.department_involved_name && complaint.department_involved_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (complaint.customer_email && complaint.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (complaint.complaint_type && complaint.complaint_type.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Format complaint type for display
  const formatComplaintType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Get status style
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'open':
        return 'bg-red-500/20 text-red-500';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-500';
      case 'resolved':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  // Get severity style
  const getSeverityStyle = (severity: string) => {
    switch(severity) {
      case 'high':
        return 'bg-red-500/20 text-red-500';
      case 'medium':
        return 'bg-amber-500/20 text-amber-500';
      case 'low':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  // Sort complaints
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    switch(sortBy) {
      case 'customer_name':
        return a.customer_name.localeCompare(b.customer_name);
      case 'severity':
        // Sort high > medium > low
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
               (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Animation variants for the tab indicator
  const tabTransition:Transition = {
    type: "spring",
    stiffness: 400,
    damping: 30
  };

  // Toggle component for private/public status
  const PrivacyToggle = ({ isPrivate, onChange, disabled = false }: { isPrivate: boolean, onChange: () => void, disabled?: boolean }) => {
    return (
      <motion.div 
        className={`relative w-24 h-7 rounded-full cursor-pointer flex items-center p-1 ${
          disabled ? 'opacity-70 cursor-not-allowed' : ''
        } ${
          isPrivate ? 'bg-[#f7eccf]/40' : 'bg-[#f7eccf]/10'
        }`}
        onClick={disabled ? undefined : onChange}
        whileHover={disabled ? {} : { scale: 1.05 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
      >
        <motion.div 
          className={`absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-400 ${
            isPrivate ? 'bg-[#f7eccf] right-4' : 'bg-[#1C1C1C] border border-[#f7eccf]/20 left-1'
          }`}
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {isPrivate ? (
            <Lock size={10} className="text-[#1C1C1C]" />
          ) : (
            <Unlock size={10} className="text-[#f7eccf]" />
          )}
        </motion.div>
        <span className={`text-xs ${isPrivate ? 'pl-1 text-[#f7eccf]' : 'pl-7 text-[#f7eccf]/70'}`}>
          {isPrivate ? 'Private' : 'Public'}
        </span>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div 
          className="rounded-full h-16 w-16 border-t-4 border-b-4 border-[#f7eccf]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
        />
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
          <CardBody className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
                  <MessageSquare className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Customer Complaints</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Track and manage customer feedback and issues
                  </p>
                </div>
              </div>
              
              <motion.button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2.5 bg-[#f7eccf] text-[#1C1C1C] rounded-full flex items-center gap-2 font-medium shadow-md"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {showForm ? (
                  <>
                    <XCircle size={18} />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Report New Complaint</span>
                  </>
                )}
              </motion.button>
            </div>
          </CardBody>
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

      {/* Complaint Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                <h2 className="text-xl font-bold text-[#f7eccf] mb-6 flex items-center">
                  <Plus size={20} className="mr-2 text-[#f7eccf]/70" />
                  Report New Complaint
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Customer Name*
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Complaint Type*
                    </label>
                    <div className="relative">
                      <select
                        name="complaint_type"
                        value={formData.complaint_type}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none"
                        required
                      >
                        <option value="product_quality" className="bg-[#1C1C1C]">Product Quality</option>
                        <option value="customer_service" className="bg-[#1C1C1C]">Customer Service</option>
                        <option value="store_experience" className="bg-[#1C1C1C]">Store Experience</option>
                        <option value="price_discrepancy" className="bg-[#1C1C1C]">Price Discrepancy</option>
                        <option value="product_availability" className="bg-[#1C1C1C]">Product Availability</option>
                        <option value="returns_refunds" className="bg-[#1C1C1C]">Returns/Refunds</option>
                        <option value="other" className="bg-[#1C1C1C]">Other</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Department Involved*
                    </label>
                    <div className="relative">
                      <select
                        name="department_involved"
                        value={formData.department_involved || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none"
                        required
                      >
                        <option value="" className="bg-[#1C1C1C]">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id} className="bg-[#1C1C1C]">
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Severity
                    </label>
                    <div className="relative">
                      <select
                        name="severity"
                        value={formData.severity}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none"
                      >
                        <option value="low" className="bg-[#1C1C1C]">Low</option>
                        <option value="medium" className="bg-[#1C1C1C]">Medium</option>
                        <option value="high" className="bg-[#1C1C1C]">High</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {(isAdmin || isManager) && (
                    <div className="flex items-center mt-6">
                      <div className="relative flex items-center">
                        <PrivacyToggle 
                          isPrivate={formData.is_private || formData.severity === 'high'}
                          onChange={() => {
                            if (formData.severity !== 'high') {
                              setFormData(prev => ({
                                ...prev,
                                is_private: !prev.is_private
                              }))
                            }
                          }}
                          disabled={formData.severity === 'high'} 
                        />
                        {formData.severity === 'high' && (
                          <span className="text-red-500 ml-3 text-sm">(Required for high severity)</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#f7eccf]/70 mb-2">
                      Description*
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent"
                      required
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 flex space-x-3 pt-4">
                    <motion.button
                      onClick={handleCreateComplaint}
                      className="px-6 py-3 bg-[#f7eccf] text-[#1C1C1C] rounded-xl font-medium shadow-md flex items-center gap-2"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle size={18} />
                      Submit Complaint
                    </motion.button>
                    <motion.button
                      onClick={() => setShowForm(false)}
                      className="px-6 py-3 bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] rounded-xl font-medium shadow-md flex items-center gap-2"
                      whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <XCircle size={18} />
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and filter bar */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              {/* Tabs */}
              <div className="flex-col flex md:flex-row  bg-[#f7eccf]/10 p-1 rounded-xl">
                {['open', 'in_progress', 'resolved', 'all'].map((tab) => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                      activeTab === tab 
                        ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                        : 'text-[#f7eccf]/70 hover:text-[#f7eccf]'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {activeTab === tab && (
                      <motion.div
                        className="absolute inset-0 bg-[#f7eccf] rounded-lg"
                        layoutId="tabBackground"
                        transition={tabTransition}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    {tab === 'all' ? 'All' : 
                     tab === 'open' ? 'Open' : 
                     tab === 'in_progress' ? 'In Progress' : 'Resolved'}
                  </motion.button>
                ))}
              </div>
              
              {/* Search bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>
            
            {/* Sort options */}
            <div className="flex items-center pt-4 border-t border-[#f7eccf]/10 mt-4">
              <div className="flex items-center gap-2 text-[#f7eccf]/70 mr-3">
                <Filter size={16} />
                <span className="text-sm">Sort by:</span>
              </div>
              <div className="w-48 relative">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                >
                  <option value="created_at" className="bg-[#1C1C1C]">Date (Newest first)</option>
                  <option value="customer_name" className="bg-[#1C1C1C]">Customer Name</option>
                  <option value="severity" className="bg-[#1C1C1C]">Severity</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                  <ChevronDown size={14} />
                </div>
              </div>
              <motion.button
                className="ml-3 p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                onClick={() => refreshComplaints()}
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <RefreshCw size={16} />
              </motion.button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Complaints List */}
      <motion.div variants={containerVariants}>
        {sortedComplaints.length === 0 ? (
          <motion.div 
            variants={itemVariants}
            className="bg-[#1C1C1C] p-8 rounded-3xl shadow-xl"
          >
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No complaints found</h3>
              <p className="text-[#f7eccf]/70 max-w-md text-center">
                {activeTab === 'all' 
                  ? "There are no complaints in the system matching your search." 
                  : activeTab === 'open'
                  ? "There are no open complaints at this time."
                  : activeTab === 'in_progress'
                  ? "There are no complaints in progress at this time."
                  : "There are no resolved complaints at this time."
                }
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sortedComplaints.map((complaint, index) => (
              <motion.div 
                key={complaint.id}
                variants={cardVariants}
                whileHover="hover"
                custom={index}
                className="relative"
              >
                <Card elevation="floating" className={`border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl ${
                  complaint.severity === 'high' ? 'border-l-4 border-red-500' : 
                  complaint.severity === 'medium' ? 'border-l-4 border-yellow-500' : 
                  'border-l-4 border-green-500'
                }`}>
                  <CardBody className="p-6">
                    {/* Resolution form */}
                    <AnimatePresence>
                      {showResolutionForm === complaint.id && (
                        <motion.div 
                          className="bg-[#f7eccf]/5 p-6 mb-6 rounded-2xl"
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <h4 className="font-semibold text-[#f7eccf] mb-3 flex items-center">
                            <CheckCircle size={18} className="mr-2 text-green-500" />
                            Add Resolution
                          </h4>
                          <textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            className="w-full p-3 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent mb-4"
                            placeholder="Enter resolution details..."
                            rows={3}
                          ></textarea>
                          <div className="flex space-x-3">
                            <motion.button
                              onClick={() => handleResolveWithComment(complaint.id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium shadow-md flex items-center gap-2"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <CheckCircle size={16} />
                              Resolve
                            </motion.button>
                            <motion.button
                              onClick={() => setShowResolutionForm(null)}
                              className="px-4 py-2 bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] rounded-xl font-medium shadow-md flex items-center gap-2"
                              whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <XCircle size={16} />
                              Cancel
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <h3 className="text-lg font-semibold text-[#f7eccf]">
                            {complaint.customer_name}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {complaint.is_private && (
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#f7eccf]/10 text-[#f7eccf] flex items-center gap-1">
                                <Lock size={12} />
                                PRIVATE
                              </span>
                            )}
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSeverityStyle(complaint.severity)}`}>
                              {complaint.severity.toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(complaint.status)}`}>
                              {complaint.status === 'in_progress' ? 'IN PROGRESS' : complaint.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-[#f7eccf]/5 mb-4">
                          <p className="text-sm text-[#f7eccf]/90">{complaint.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                            <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                              <MessageSquare size={14} className="text-[#f7eccf]/70" />
                            </div>
                            <span>{formatComplaintType(complaint.complaint_type)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                            <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                              <Users size={14} className="text-[#f7eccf]/70" />
                            </div>
                            <span>{complaint.department_involved_name || 'Department not specified'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                            <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                              <Calendar size={14} className="text-[#f7eccf]/70" />
                            </div>
                            <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                            <span className="font-medium">Reported by:</span>
                            <span>{complaint.reported_by_name || `Employee ID: ${complaint.reported_by}`}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                            <span className="font-medium">Assigned to:</span>
                            <span>{complaint.assigned_to_name || 'Unassigned'}</span>
                          </div>
                        </div>
                        
                        {complaint.resolution && (
                          <div className="mt-4 p-4 bg-green-500/10 rounded-2xl">
                            <div className="flex items-center mb-2">
                              <CheckCircle size={16} className="text-green-500 mr-2" />
                              <span className="text-sm font-medium text-green-500">Resolution</span>
                            </div>
                            <p className="text-sm text-[#f7eccf]/90">{complaint.resolution}</p>
                          </div>
                        )}
                        
                        {complaint.customer_email && (
                          <div className="mt-4 text-sm text-[#f7eccf]/70">
                            <span className="font-medium">Email:</span> {complaint.customer_email}
                          </div>
                        )}
                        
                        {complaint.customer_phone && (
                          <div className="mt-1 text-sm text-[#f7eccf]/70">
                            <span className="font-medium">Phone:</span> {complaint.customer_phone}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-row flex-wrap md:flex-col justify-start items-start gap-3 mt-6 md:mt-0 md:ml-6">
                        {/* Status update buttons */}
                        {complaint.status !== 'resolved' && (
                          <>
                            {complaint.status === 'open' && (
                              <motion.button
                                onClick={() => updateComplaintStatus(complaint.id, 'in_progress')}
                                className="px-4 py-2 bg-blue-500 text-white rounded-xl shadow-md flex items-center gap-2"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Clock size={16} />
                                Start
                              </motion.button>
                            )}
                            
                            {complaint.status === 'in_progress' && (
                              <motion.button
                                onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                                className="px-4 py-2 bg-green-500 text-white rounded-xl shadow-md flex items-center gap-2"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <CheckCircle size={16} />
                                Resolve
                              </motion.button>
                            )}
                          </>
                        )}
                        
                        {/* Assignment dropdown (for managers/admins) */}
                        {(isAdmin || isManager) && !complaint.assigned_to && complaint.department_involved && (
                          <div className="relative">
                            <motion.button
                              onClick={() => setShowAssignDropdown(showAssignDropdown === complaint.id ? null : complaint.id)}
                              className="px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] rounded-xl shadow-md flex items-center gap-2 min-w-[140px]"
                              whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.15)' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <UserCheck size={16} />
                              Assign
                              <ChevronDown size={14} className={`ml-auto transition-transform ${showAssignDropdown === complaint.id ? 'rotate-180' : ''}`} />
                            </motion.button>
                            
                            <AnimatePresence>
                              {showAssignDropdown === complaint.id && (
                                <motion.div 
                                  className="relative left-0 mt-2 w-60 bg-[#1C1C1C] border border-[#f7eccf]/20 rounded-xl shadow-xl z-99"
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="p-2 max-h-60 overflow-y-auto">
                                    <div className="px-3 py-2 text-xs font-medium text-[#f7eccf]/50 uppercase">
                                      Select employee
                                    </div>
                                    {employees
                                      .filter(emp => emp.department_id === complaint.department_involved)
                                      .map(emp => (
                                        <motion.div
                                          key={emp.id}
                                          className="px-3 py-2 hover:bg-[#f7eccf]/10 rounded-lg cursor-pointer text-[#f7eccf] text-sm flex items-center gap-2"
                                          onClick={() => assignComplaint(complaint.id, emp.id)}
                                          whileHover={{ x: 4 }}
                                        >
                                          <div className="w-7 h-7 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                                            {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                                          </div>
                                          <span>{emp.first_name} {emp.last_name}</span>
                                        </motion.div>
                                      ))
                                    }
                                    {employees.filter(emp => emp.department_id === complaint.department_involved).length === 0 && (
                                      <div className="px-3 py-2 text-[#f7eccf]/50 text-sm italic">
                                        No employees available
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        
                        {/* Privacy toggle (for managers/admins) */}
                        {(isAdmin || isManager) && complaint.severity !== 'high' && (
                          <PrivacyToggle 
                            isPrivate={complaint.is_private}
                            onChange={() => togglePrivacy(complaint.id, !complaint.is_private)}
                            disabled={complaint.severity === 'high'} 
                          />
                        )}
                        
                        {/* Delete button */}
                        {(isAdmin || isManager) && (
                          <motion.button
                            onClick={() => setDeleteConfirmId(complaint.id)}
                            className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl shadow-md flex items-center gap-2"
                            whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Trash2 size={16} />
                            Delete
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete confirmation modal - centered on screen */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop with blur */}
            <motion.div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
            />
            
            {/* Modal content */}
            <motion.div
              className="bg-[#1C1C1C] rounded-3xl shadow-2xl p-6 max-w-md w-full z-10 border border-[#f7eccf]/10"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-center mb-4 text-red-500">
                <div className="p-3 bg-red-500/10 rounded-xl mr-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold">Confirm Deletion</h3>
              </div>
              
              <p className="text-[#f7eccf]/90 mb-6">
                Are you sure you want to delete this complaint? This action cannot be undone and all associated data will be permanently removed.
              </p>
              
              <div className="flex space-x-3 justify-end">
                <motion.button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-5 py-2.5 bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] rounded-xl font-medium shadow-md flex items-center gap-2"
                  whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <XCircle size={18} />
                  Cancel
                </motion.button>
                <motion.button
                  onClick={() => deleteComplaint(deleteConfirmId)}
                  className="px-5 py-2.5 bg-red-500 text-white rounded-xl font-medium shadow-md flex items-center gap-2"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 size={18} />
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}