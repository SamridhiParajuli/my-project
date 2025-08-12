// app/(dashboard)/preorders/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { SearchBar } from '@/components/ui/SearchBar'
import { 
  Package, 
  AlertCircle, 
  Plus, 
  X, 
  ChevronDown,
  ChevronRight,
  Search,
  Calendar, 
  Clock, 
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Filter,
  ArrowRight,
  ShoppingCart,
  DollarSign,
  Truck,
  FileText,
  RefreshCw,
  Check
} from 'lucide-react'

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

interface PreOrder {
  id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  order_type: string
  description: string
  target_department: number | null
  target_department_name?: string
  requested_by: number
  requested_by_name?: string
  assigned_to: number | null
  assigned_to_name?: string
  quantity: number | null
  estimated_price: number | null
  pickup_date: string | null
  special_instructions: string | null
  status: string
  created_at: string
  completed_at: string | null
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

// Define proper type for form data
interface PreOrderFormData {
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  order_type: string
  description: string
  target_department: number | null
  assigned_to: number | null
  quantity: number | null
  estimated_price: number | null
  pickup_date: string | null
  special_instructions: string | null
  status: string
}

export default function PreOrdersPage() {
  const { user, isManager, isAdmin } = useAuth()
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  const [preorders, setPreorders] = useState<PreOrder[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // New state variables
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    id: number;
    newStatus?: string;
    employeeId?: number;
  } | null>(null)
  const [actionLoading, setActionLoading] = useState<{
    id: number | null;
    type: string | null;
  }>({ id: null, type: null })
  
  // New states for edit functionality
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDialogText, setConfirmDialogText] = useState('')
  
  // Initialize form with proper types
  const emptyFormData: PreOrderFormData = {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    order_type: 'custom_order',
    description: '',
    target_department: user?.department_id || null,
    assigned_to: null,
    quantity: 1,
    estimated_price: null,
    pickup_date: '',
    special_instructions: '',
    status: 'pending'
  }
  
  const [formData, setFormData] = useState<PreOrderFormData>(emptyFormData)
  
  const [pagination, setPagination] = useState({
    currentPage: 0,
    limit: 10,
    total: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

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

        // Fetch preorders with appropriate filtering
        let endpoint = '/preorders';
        const params: any = {
          ...(activeTab !== 'all' ? { status: activeTab } : {}),
          ...(isAdmin && selectedDepartment ? { target_department: selectedDepartment } : {}),
          skip: pagination.currentPage * pagination.limit,
          limit: pagination.limit
        };

        // If user is not admin and has department, fetch department preorders or assigned preorders
        if (!isAdmin && user?.department_id) {
          if (isManager) {
            // Managers see all preorders in their department
            endpoint = `/preorders/department/${user.department_id}`;
          } else {
            // Staff sees preorders assigned to them
            params.assigned_to = user.employee_id;
          }
        }

        const response = await api.get(endpoint, { params })

        if (response.data && response.data.items) {
          setPreorders(response.data.items)
          
          // Update pagination state if available in response
          if (response.data.pagination) {
            setPagination({
              currentPage: Math.floor(response.data.pagination.offset / response.data.pagination.limit),
              limit: response.data.pagination.limit,
              total: response.data.pagination.total
            });
          }
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching preorders:', err)
        setError(err.response?.data?.detail || 'Failed to load preorders')
        setLoading(false)
      }
    }

    fetchData()
  }, [user, activeTab, isAdmin, isManager, selectedDepartment, pagination.currentPage, pagination.limit])

  const formatPrice = (price: any): string => {
    if (price === null || price === undefined || price === '') {
      return 'N/A';
    }
    
    try {
      // Convert to number if it's a string
      const numPrice = typeof price === 'string' ? parseFloat(price) : price;
      
      // Check if it's a valid number
      if (typeof numPrice === 'number' && !isNaN(numPrice)) {
        return `${numPrice.toFixed(2)}`;
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error formatting price:', error);
      return 'N/A';
    }
  };

  // Fixed handleInputChange function with proper typing
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'target_department' || name === 'assigned_to') {
      setFormData(prevState => ({
        ...prevState,
        [name]: value === '' ? null : Number(value)
      }));
    } else if (name === 'quantity') {
      setFormData(prevState => ({
        ...prevState,
        quantity: value === '' ? null : Number(value)
      }));
    } else if (name === 'estimated_price') {
      setFormData(prevState => ({
        ...prevState,
        estimated_price: value === '' ? null : parseFloat(value)
      }));
    } else {
      setFormData(prevState => ({ 
        ...prevState, 
        [name]: value 
      }));
    }
  }

  // Fixed handleDepartmentChange function with proper typing
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const departmentId = e.target.value === '' ? null : Number(e.target.value)
    
    setFormData(prevState => ({
      ...prevState,
      target_department: departmentId,
      assigned_to: null // Reset the assigned employee when department changes
    }));
  }

  const handleCreatePreOrder = async () => {
    try {
      if (!formData.customer_name || !formData.description || !formData.order_type) {
        setError('Customer name, description and order type are required')
        return
      }
      
      setActionLoading({ id: 0, type: 'create' });
      
      const payload = {
        ...formData,
        requested_by: user?.employee_id
      }
      
      // If department is selected, automatically assign to department manager
      if (formData.target_department && !formData.assigned_to) {
        // Find department manager
        const departmentEmployees = employees.filter(
          emp => emp.department_id === formData.target_department && 
                (emp.position?.toLowerCase().includes('manager') || 
                 emp.position?.toLowerCase().includes('lead'))
        )
        
        if (departmentEmployees.length > 0) {
          payload.assigned_to = departmentEmployees[0].id
        }
      }
      
      await api.post('/preorders', payload)
      setShowForm(false)
      
      // Reset form
      setFormData(emptyFormData)
      
      // Refresh preorders list
      refreshPreOrders();
      
      setError(null)
    } catch (err: any) {
      console.error('Error creating preorder:', err)
      setError(err.response?.data?.detail || 'Failed to create preorder')
    } finally {
      setActionLoading({ id: null, type: null });
    }
  }
  
  const updatePreOrderStatus = (preorderId: number, newStatus: string) => {
    // Set confirmation dialog message based on status
    let confirmMessage = 'Are you sure you want to change this pre-order\'s status to ' + newStatus + '?';
    
    if (newStatus === 'cancelled') {
      confirmMessage = 'Are you sure you want to cancel this pre-order? This action cannot be undone.';
    }
    
    setConfirmDialogText(confirmMessage);
    setConfirmAction({
      type: 'status',
      id: preorderId,
      newStatus: newStatus
    });
    setIsConfirmDialogOpen(true);
  }

  const assignPreOrder = (preorderId: number, employeeId: number) => {
    setConfirmDialogText('Are you sure you want to assign this pre-order to this employee?');
    setConfirmAction({
      type: 'assign',
      id: preorderId,
      employeeId: employeeId
    });
    setIsConfirmDialogOpen(true);
  }

  // New function to handle edit pre-order
  const editPreOrder = (preorder: PreOrder) => {
    // First set all the form data
    setFormData({
      customer_name: preorder.customer_name,
      customer_email: preorder.customer_email,
      customer_phone: preorder.customer_phone,
      order_type: preorder.order_type,
      description: preorder.description,
      target_department: preorder.target_department,
      assigned_to: preorder.assigned_to,
      quantity: preorder.quantity,
      estimated_price: preorder.estimated_price,
      pickup_date: preorder.pickup_date ? new Date(preorder.pickup_date).toISOString().split('T')[0] : null,
      special_instructions: preorder.special_instructions,
      status: preorder.status
    });
    
    // Set editing state
    setIsEditing(true);
    setEditingId(preorder.id);
    
    // Show the form and scroll after a delay to ensure the form is rendered
    setShowForm(true);
    
    // Use a longer delay to ensure the form is fully rendered and animated in
    setTimeout(() => {
      // Try using the ref first
      if (formRef.current) {
        formRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else {
        // Fallback to scrolling to top if ref is not available
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        });
      }
      
      // Additional fallback - try again with a longer delay if needed
      setTimeout(() => {
        if (formRef.current) {
          // Use a more direct scrolling method as a fallback
          const yOffset = formRef.current.getBoundingClientRect().top + window.pageYOffset - 20;
          window.scrollTo({
            top: yOffset,
            behavior: 'smooth'
          });
        }
      }, 300);
    }, 200);
  };
  
  // New function to handle delete pre-order
  const deletePreOrder = (preorderId: number) => {
    const preorder = preorders.find(p => p.id === preorderId);
    
    // Check if preorder is over 30 days old if completed
    let isOld = false;
    if (preorder?.status === 'completed' && preorder.completed_at) {
      const completedDate = new Date(preorder.completed_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      isOld = completedDate < thirtyDaysAgo;
    }
    
    let confirmMessage = isOld 
      ? 'This pre-order was completed over 30 days ago. Are you sure you want to delete it?' 
      : 'Are you sure you want to permanently delete this pre-order? This action cannot be undone.';
    
    setConfirmDialogText(confirmMessage);
    setConfirmAction({
      type: 'delete',
      id: preorderId,
    });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    try {
      setError(null);
      setActionLoading({ id: confirmAction.id, type: confirmAction.type });
      
      if (confirmAction.type === 'status' && confirmAction.newStatus) {
        await api.patch(`/preorders/${confirmAction.id}/status`, { status: confirmAction.newStatus });
        
        // Update preorder in the list
        setPreorders(prev => prev.map(p => 
          p.id === confirmAction.id ? { ...p, status: confirmAction.newStatus! } : p
        ));
      } else if (confirmAction.type === 'assign' && confirmAction.employeeId) {
        await api.patch(`/preorders/${confirmAction.id}/assign`, { assigned_to: confirmAction.employeeId });
        
        // Refresh preorders to get updated assignment info
        await refreshPreOrders();
      } else if (confirmAction.type === 'delete') {
        await api.delete(`/preorders/${confirmAction.id}`);
        
        // Remove the deleted preorder from the list
        setPreorders(prev => prev.filter(p => p.id !== confirmAction.id));
      }
    } catch (err: any) {
      console.error(`Error updating preorder ${confirmAction.type}:`, err);
      setError(err.response?.data?.detail || `Failed to ${confirmAction.type} preorder`);
    } finally {
      setIsConfirmDialogOpen(false);
      setConfirmAction(null);
      setActionLoading({ id: null, type: null });
    }
  };
  
  // New function to handle saving edited pre-order
  const handleSaveEditedPreOrder = async () => {
    try {
      if (!formData.customer_name || !formData.description || !formData.order_type) {
        setError('Customer name, description and order type are required')
        return
      }
      
      if (!editingId) {
        setError('Something went wrong with editing. Please try again.')
        return
      }
      
      setActionLoading({ id: editingId, type: 'edit' });
      
      const payload = { ...formData };
      
      await api.put(`/preorders/${editingId}`, payload);
      
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      
      // Reset form
      setFormData(emptyFormData);
      
      // Refresh preorders list
      refreshPreOrders();
      
      setError(null);
    } catch (err: any) {
      console.error('Error updating preorder:', err);
      setError(err.response?.data?.detail || 'Failed to update preorder');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };
  
  const refreshPreOrders = async () => {
    try {
      let endpoint = '/preorders';
      const params: any = {
        ...(activeTab !== 'all' ? { status: activeTab } : {}),
        ...(isAdmin && selectedDepartment ? { target_department: selectedDepartment } : {}),
        skip: pagination.currentPage * pagination.limit,
        limit: pagination.limit
      };
      
      if (!isAdmin && user?.department_id) {
        if (isManager) {
          endpoint = `/preorders/department/${user.department_id}`;
        } else {
          params.assigned_to = user.employee_id;
        }
      }
      
      const response = await api.get(endpoint, { params });
      if (response.data && response.data.items) {
        setPreorders(response.data.items);
        
        // Update pagination state if available in response
        if (response.data.pagination) {
          setPagination({
            currentPage: Math.floor(response.data.pagination.offset / response.data.pagination.limit),
            limit: response.data.pagination.limit,
            total: response.data.pagination.total
          });
        }
      }
    } catch (err: any) {
      console.error('Error refreshing preorders:', err);
      setError(err.response?.data?.detail || 'Failed to refresh preorders');
    }
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(emptyFormData);
    setShowForm(false);
  };

  const filteredPreOrders = preorders.filter(preorder => 
    preorder.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    preorder.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (preorder.target_department_name && preorder.target_department_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (preorder.customer_email && preorder.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (preorder.order_type && preorder.order_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Check if a pre-order is over 30 days old
  const isOverThirtyDays = (preorder: PreOrder): boolean => {
    if (preorder.status !== 'completed' || !preorder.completed_at) return false;
    
    const completedDate = new Date(preorder.completed_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return completedDate < thirtyDaysAgo;
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      // Wait for state update and component to render
      setTimeout(() => {
        // Try scrolling to the form element directly
        const formElement = document.getElementById('preorderForm');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (formRef.current) {
          formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div 
          className="w-16 h-16 rounded-full border-4 border-[#f7eccf] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
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
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
                  <Package className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Pre-Order Management</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    {activeTab === 'pending' ? 'Manage pending pre-orders' : 
                     activeTab === 'in_progress' ? 'Track pre-orders in progress' : 
                     activeTab === 'completed' ? 'View completed pre-orders' : 
                     activeTab === 'cancelled' ? 'View cancelled pre-orders' :
                     'All pre-orders overview'}
                  </p>
                </div>
              </div>
              
              {!isEditing ? (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    onClick={toggleForm}
                    className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                  >
                    {showForm ? (
                      <>
                        <X size={18} />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        <span>Create New Pre-Order</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <div className="bg-[#f7eccf]/10 px-4 py-2 rounded-full text-[#f7eccf]">
                  <span className="flex items-center gap-2">
                    <Edit size={16} />
                    Editing Pre-Order #{editingId}
                  </span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div 
          variants={itemVariants}
          className="bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-red-500 flex items-center"
        >
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Create/Edit Pre-Order Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            ref={formRef}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            id="preorderForm"
          >
            <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-[#f7eccf] flex items-center">
                  {isEditing ? (
                    <>
                      <Edit className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                      Edit Pre-Order #{editingId}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                      Create New Pre-Order
                    </>
                  )}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Customer Name*
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Order Type*
                    </label>
                    <div className="relative">
                      <select
                        name="order_type"
                        value={formData.order_type}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                        required
                      >
                        <option value="custom_order" className="bg-[#1C1C1C]">Custom Order</option>
                        <option value="bulk_order" className="bg-[#1C1C1C]">Bulk Order</option>
                        <option value="special_event" className="bg-[#1C1C1C]">Special Event</option>
                        <option value="seasonal_item" className="bg-[#1C1C1C]">Seasonal Item</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Department*
                    </label>
                    <div className="relative">
                      <select
                        name="target_department"
                        value={formData.target_department || ''}
                        onChange={handleDepartmentChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
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
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Assign To
                    </label>
                    <div className="relative">
                      <select
                        name="assigned_to"
                        value={formData.assigned_to || ''}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                      >
                        <option value="" className="bg-[#1C1C1C]">Auto-assign to Department Manager</option>
                        {employees
                          .filter(emp => 
                            !formData.target_department || emp.department_id === formData.target_department
                          )
                          .map(emp => (
                            <option key={emp.id} value={emp.id} className="bg-[#1C1C1C]">
                              {emp.first_name} {emp.last_name} ({emp.position})
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Estimated Price
                    </label>
                    <input
                      type="number"
                      name="estimated_price"
                      value={formData.estimated_price || ''}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      name="pickup_date"
                      value={formData.pickup_date || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Description*
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                      required
                    ></textarea>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Special Instructions
                    </label>
                    <textarea
                      name="special_instructions"
                      value={formData.special_instructions || ''}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 flex justify-end space-x-4">
                    {isEditing ? (
                      <>
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={handleCancelEdit}
                            className="bg-[#333333] text-[#f7eccf] hover:bg-[#444444] rounded-full shadow-md px-6 py-3"
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
                            onClick={handleSaveEditedPreOrder}
                            className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full shadow-md px-6 py-3 flex items-center gap-2"
                            disabled={actionLoading.id === editingId && actionLoading.type === 'edit'}
                          >
                            {actionLoading.id === editingId && actionLoading.type === 'edit' ? (
                              <>
                                <motion.div
                                  className="w-4 h-4 border-2 border-[#1C1C1C] border-t-transparent rounded-full mr-2"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check size={18} />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      <motion.div
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          onClick={handleCreatePreOrder}
                          className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full shadow-md px-6 py-3 flex items-center gap-2"
                          disabled={actionLoading.id === 0 && actionLoading.type === 'create'}
                        >
                          {actionLoading.id === 0 && actionLoading.type === 'create' ? (
                            <>
                              <motion.div
                                className="w-4 h-4 border-2 border-[#1C1C1C] border-t-transparent rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus size={18} />
                              Create Pre-Order
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
              {/* Navigation Tabs */}
              <div className="flex-col flex md:flex-row space-1 bg-[#f7eccf]/10 p-1 rounded-xl">
                {['pending', 'in_progress', 'completed', 'cancelled', 'all'].map((tab) => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
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
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
                  </motion.button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search pre-orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>

            {/* Department Filter (for admins) */}
            {isAdmin && (
              <div className="flex items-center pt-4 border-t border-[#f7eccf]/10">
                <div className="flex items-center gap-2 text-[#f7eccf]/70 mr-3">
                  <Filter size={16} />
                  <span className="text-sm">Filter by Department:</span>
                </div>
                <div className="w-64 relative">
                  <select 
                    value={selectedDepartment || ''} 
                    onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                  >
                    <option value="" className="bg-[#1C1C1C]">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id} className="bg-[#1C1C1C]">{dept.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronDown size={14} />
                  </div>
                </div>
                <motion.button
                  onClick={() => refreshPreOrders()}
                  className="ml-3 p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5 }}
                >
                  <RefreshCw size={16} />
                </motion.button>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Pre-Orders List */}
      {filteredPreOrders.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-[#f7eccf]/50" />
          </div>
          <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No pre-orders found</h3>
          <p className="text-[#f7eccf]/70 max-w-md mx-auto">
            {searchTerm 
              ? "No pre-orders match your search criteria. Try adjusting your search."
              : activeTab !== 'all'
                ? `No ${activeTab.replace('_', ' ')} pre-orders found.`
                : "No pre-orders have been created yet."}
          </p>
          {activeTab !== 'pending' && (
            <motion.div
              className="mt-6"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                onClick={() => setActiveTab('pending')}
                className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full shadow-md px-5 py-2.5 inline-flex items-center gap-2"
              >
                <Filter size={16} />
                View Pending Pre-Orders
              </Button>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredPreOrders.map(preorder => (
            <motion.div 
              key={preorder.id} 
              variants={cardVariants}
              whileHover="hover"
              className="relative"
            >
              <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
                <CardBody className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className="text-lg font-medium text-[#f7eccf]">{preorder.customer_name}</h3>
                        <span className="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-[#f7eccf]/10 text-[#f7eccf] flex items-center">
                          <ShoppingCart size={12} className="mr-1" />
                          {preorder.order_type.replace('_', ' ').toUpperCase()}
                        </span>
                        {preorder.status === 'cancelled' && (
                          <span className="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-500 flex items-center">
                            <XCircle size={12} className="mr-1" />
                            CANCELLED
                          </span>
                        )}
                      </div>
                      <p className="text-[#f7eccf]/80 mb-4 line-clamp-2">{preorder.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 text-sm text-[#f7eccf]/60">
                        <div className="flex items-center">
                          <Users size={14} className="mr-2 text-[#f7eccf]/40" />
                          <span>{preorder.target_department_name || 'No Department'}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                          <span>{preorder.assigned_to_name || 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign size={14} className="mr-2 text-[#f7eccf]/40" />
                          <span>{formatPrice(preorder.estimated_price)}</span>
                        </div>
                        <div className="flex items-center">
                          <Truck size={14} className="mr-2 text-[#f7eccf]/40" />
                          <span>Qty: {preorder.quantity || 'N/A'}</span>
                        </div>
                        <div className="flex items-center col-span-2 md:col-span-1">
                          {preorder.pickup_date ? (
                            <>
                              <Calendar size={14} className="mr-2 text-[#f7eccf]/40" />
                              <span>{new Date(preorder.pickup_date).toLocaleDateString()}</span>
                            </>
                          ) : (
                            <>
                              <Clock size={14} className="mr-2 text-[#f7eccf]/40" />
                              <span>No pickup date</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {preorder.special_instructions && (
                        <div className="mt-3 bg-[#f7eccf]/5 rounded-xl p-3 text-sm text-[#f7eccf]/70 flex items-start">
                          <FileText size={14} className="mr-2 mt-0.5 text-[#f7eccf]/40 flex-shrink-0" />
                          <span>{preorder.special_instructions}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col mt-4 md:mt-0 md:ml-6 md:min-w-[180px] justify-between">
                      <div className="mb-4">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                          preorder.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                          preorder.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                          preorder.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                          'bg-green-500/20 text-green-500'
                        }`}>
                          {preorder.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {preorder.status === 'in_progress' && <ArrowRight size={12} className="mr-1" />}
                          {preorder.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                          {preorder.status === 'cancelled' && <XCircle size={12} className="mr-1" />}
                          {preorder.status === 'pending' ? 'Pending' :
                          preorder.status === 'in_progress' ? 'In Progress' :
                          preorder.status === 'cancelled' ? 'Cancelled' :
                          'Completed'}
                        </span>
                      </div>
                      
                      {/* Action buttons for preorder */}
                      <div className="space-y-2">
                        {/* Status update buttons */}
                        {(isAdmin || isManager || user?.employee_id === preorder.assigned_to) && preorder.status !== 'completed' && preorder.status !== 'cancelled' && (
                          <>
                            {preorder.status === 'pending' && (
                              <motion.div
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  onClick={() => updatePreOrderStatus(preorder.id, 'in_progress')}
                                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                                  size="sm"
                                  disabled={actionLoading.id === preorder.id && actionLoading.type === 'status'}
                                >
                                  {actionLoading.id === preorder.id && actionLoading.type === 'status' ? (
                                    <>
                                      <motion.div
                                        className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRight size={14} />
                                      Start
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            )}
                            
                            {preorder.status === 'in_progress' && (
                              <motion.div
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  onClick={() => updatePreOrderStatus(preorder.id, 'completed')}
                                  className="w-full bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                                  size="sm"
                                  disabled={actionLoading.id === preorder.id && actionLoading.type === 'status'}
                                >
                                  {actionLoading.id === preorder.id && actionLoading.type === 'status' ? (
                                    <>
                                      <motion.div
                                        className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle size={14} />
                                      Complete
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            )}
                            
                            {/* Cancel button - available for pending and in_progress orders */}
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button
                                onClick={() => updatePreOrderStatus(preorder.id, 'cancelled')}
                                className="w-full bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                                size="sm"
                                disabled={actionLoading.id === preorder.id && actionLoading.type === 'status'}
                              >
                                {actionLoading.id === preorder.id && actionLoading.type === 'status' ? (
                                  <>
                                    <motion.div
                                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={14} />
                                    Cancel Order
                                  </>
                                )}
                              </Button>
                            </motion.div>
                            
                            {/* Edit button */}
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button
                                onClick={() => editPreOrder(preorder)}
                                className="w-full bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                                size="sm"
                              >
                                <Edit size={14} />
                                Edit
                              </Button>
                            </motion.div>
                          </>
                        )}
                        
                        {/* Delete button - only for admin, manager, or old completed orders */}
                        {((isAdmin || isManager) || isOverThirtyDays(preorder)) && (
                          <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              onClick={() => deletePreOrder(preorder.id)}
                              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                              size="sm"
                              disabled={actionLoading.id === preorder.id && actionLoading.type === 'delete'}
                            >
                              {actionLoading.id === preorder.id && actionLoading.type === 'delete' ? (
                                <>
                                  <motion.div
                                    className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 size={14} />
                                  Delete
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )}
                          
                        {/* Assignment dropdown (for managers/admins) */}
                        {(isAdmin || isManager) && !preorder.assigned_to && preorder.target_department && preorder.status !== 'cancelled' && preorder.status !== 'completed' && (
                          <div className="relative mt-2">
                            <select
                              onChange={(e) => {
                                const selectedEmployeeId = parseInt(e.target.value);
                                if (selectedEmployeeId) {
                                  assignPreOrder(preorder.id, selectedEmployeeId);
                                }
                              }}
                              className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-xs"
                              defaultValue=""
                              disabled={actionLoading.id === preorder.id && actionLoading.type === 'assign'}
                            >
                              <option value="" disabled className="bg-[#1C1C1C]">
                                {actionLoading.id === preorder.id && actionLoading.type === 'assign'
                                  ? 'Assigning...'
                                  : 'Assign to employee'}
                              </option>
                              {employees
                                .filter(emp => emp.department_id === preorder.target_department)
                                .map(emp => (
                                  <option key={emp.id} value={emp.id} className="bg-[#1C1C1C]">
                                    {emp.first_name} {emp.last_name}
                                  </option>
                                ))
                              }
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#f7eccf]/50">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
          
          {/* Pagination Controls */}
          <motion.div 
            variants={itemVariants}
            className="mt-6 flex items-center justify-between"
          >
            <div className="text-sm text-[#f7eccf]/70">
              Showing {pagination.currentPage * pagination.limit + 1} to{' '}
              {Math.min((pagination.currentPage + 1) * pagination.limit, pagination.total)} of{' '}
              {pagination.total} entries
            </div>
            <div className="flex space-x-2">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  onClick={() => {
                    setPagination(prev => ({
                      ...prev,
                      currentPage: prev.currentPage - 1
                    }));
                  }}
                  disabled={pagination.currentPage === 0}
                  className="px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 disabled:opacity-50 disabled:hover:bg-[#f7eccf]/10 rounded-xl"
                  size="sm"
                >
                  Previous
                </Button>
              </motion.div>
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  onClick={() => {
                    setPagination(prev => ({
                      ...prev,
                      currentPage: prev.currentPage + 1
                    }));
                  }}
                  disabled={(pagination.currentPage + 1) * pagination.limit >= pagination.total}
                  className="px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 disabled:opacity-50 disabled:hover:bg-[#f7eccf]/10 rounded-xl"
                  size="sm"
                >
                  Next
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {isConfirmDialogOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setConfirmAction(null);
              }}
            />
            <motion.div 
              className="bg-[#1C1C1C] rounded-3xl shadow-2xl p-8 max-w-md w-full z-10 relative border border-[#f7eccf]/10"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <h3 className="text-xl font-semibold mb-4 text-[#f7eccf]">Confirm Action</h3>
              <p className="mb-6 text-[#f7eccf]/80">{confirmDialogText}</p>
              <div className="flex justify-end space-x-4">
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button 
                    onClick={() => {
                      setIsConfirmDialogOpen(false);
                      setConfirmAction(null);
                    }}
                    className="bg-[#333333] text-[#f7eccf] hover:bg-[#444444] rounded-full px-5 py-2"
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
                    onClick={handleConfirmAction}
                    className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full px-5 py-2"
                  >
                    Confirm
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}