// app/(dashboard)/preorders/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import SearchBar from '@/components/ui/SearchBar'

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
  const [pagination, setPagination] = useState({
    currentPage: 0,
    limit: 10,
    total: 0
  })
  
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
        return `$${numPrice.toFixed(2)}`;
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
    
    setIsEditing(true);
    setEditingId(preorder.id);
    setShowForm(true);
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-primary">Pre-Order Management</h1>
        {!isEditing ? (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white"
          >
            {showForm ? 'Cancel' : 'Create New Pre-Order'}
          </Button>
        ) : (
          <div className="text-lg font-medium">Editing Pre-Order #{editingId}</div>
        )}
      </div>

      {error && (
        <div className="bg-accent-red/10 text-accent-red p-4 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? `Edit Pre-Order #${editingId}` : 'Create New Pre-Order'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Customer Name*
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Order Type*
                </label>
                <select
                  name="order_type"
                  value={formData.order_type}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="custom_order">Custom Order</option>
                  <option value="bulk_order">Bulk Order</option>
                  <option value="special_event">Special Event</option>
                  <option value="seasonal_item">Seasonal Item</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Department*
                </label>
                <select
                  name="target_department"
                  value={formData.target_department || ''}
                  onChange={handleDepartmentChange}
                  className="w-full p-2 border rounded-md"
                  required
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
                <label className="block text-sm font-medium text-primary mb-1">
                  Assign To
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Auto-assign to Department Manager</option>
                  {employees
                    .filter(emp => 
                      !formData.target_department || emp.department_id === formData.target_department
                    )
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.position})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Estimated Price
                </label>
                <input
                  type="number"
                  name="estimated_price"
                  value={formData.estimated_price || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Pickup Date
                </label>
                <input
                  type="date"
                  name="pickup_date"
                  value={formData.pickup_date || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-primary mb-1">
                  Description*
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-2 border rounded-md"
                  required
                ></textarea>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-primary mb-1">
                  Special Instructions
                </label>
                <textarea
                  name="special_instructions"
                  value={formData.special_instructions || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full p-2 border rounded-md"
                ></textarea>
              </div>

              <div className="md:col-span-2 flex space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveEditedPreOrder}
                      className="bg-primary text-white flex-1"
                      disabled={actionLoading.id === editingId && actionLoading.type === 'edit'}
                    >
                      {actionLoading.id === editingId && actionLoading.type === 'edit' ? (
                        <span className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving Changes...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      className="bg-gray-300 text-gray-800 flex-1"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleCreatePreOrder}
                    className="bg-primary text-white w-full"
                    disabled={actionLoading.id === 0 && actionLoading.type === 'create'}
                  >
                    {actionLoading.id === 0 && actionLoading.type === 'create' ? (
                      <span className="inline-flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Pre-Order...
                      </span>
                    ) : (
                      'Create Pre-Order'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'in_progress'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'cancelled'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Cancelled
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              All
            </button>
          </nav>
        </div>

        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search pre-orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Department filter for admins */}
            {isAdmin && (
              <div className="md:w-64">
                <label className="block text-sm font-medium text-primary mb-1">
                  Filter by Department
                </label>
                <select 
                  value={selectedDepartment || ''} 
                  onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filteredPreOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pre-orders found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPreOrders.map(preorder => (
                <Card key={preorder.id}>
                  <CardBody>
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-primary">{preorder.customer_name}</h3>
                          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-black text-white">
                            {preorder.order_type.replace('_', ' ').toUpperCase()}
                          </span>
                          {preorder.status === 'cancelled' && (
                            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-500 text-white">
                              CANCELLED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{preorder.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                          <div>
                            <span className="font-semibold">Department:</span> {preorder.target_department_name || 'Not assigned'}
                          </div>
                          <div>
                            <span className="font-semibold">Requested by:</span> {preorder.requested_by_name || `Employee ID: ${preorder.requested_by}`}
                          </div>
                          <div>
                            <span className="font-semibold">Assigned to:</span> {preorder.assigned_to_name || 'Unassigned'}
                          </div>
                          <div>
                            <span className="font-semibold">Quantity:</span> {preorder.quantity || 'N/A'}
                          </div>
                          <div>
                            <span className="font-semibold">Est. Price:</span> {formatPrice(preorder.estimated_price)}
                          </div>
                          <div>
                            <span className="font-semibold">Pickup date:</span> {preorder.pickup_date ? new Date(preorder.pickup_date).toLocaleDateString() : 'Not specified'}
                          </div>
                        </div>
                        {preorder.special_instructions && (
                          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded mb-2">
                            <span className="font-semibold">Special Instructions:</span> {preorder.special_instructions}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between mt-4 md:mt-0 md:ml-4">
                        <div className="mb-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            preorder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            preorder.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            preorder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {preorder.status === 'pending' ? 'Pending' :
                            preorder.status === 'in_progress' ? 'In Progress' :
                            preorder.status === 'cancelled' ? 'Cancelled' :
                            'Completed'}
                          </span>
                        </div>
                        
                        {/* Action buttons for preorder */}
                        <div className="flex flex-col space-y-2">
                          {/* Status update buttons */}
                          {(isAdmin || isManager || user?.employee_id === preorder.assigned_to) && preorder.status !== 'completed' && preorder.status !== 'cancelled' && (
                            <>
                              {preorder.status === 'pending' && (
                                <Button
                                  onClick={() => updatePreOrderStatus(preorder.id, 'in_progress')}
                                  className="bg-blue-500 text-white text-xs px-2 py-1"
                                  size="sm"
                                  disabled={actionLoading.id === preorder.id && actionLoading.type === 'status'}
                                >
                                  {actionLoading.id === preorder.id && actionLoading.type === 'status' ? (
                                    <span className="inline-flex items-center">
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Processing...
                                    </span>
                                  ) : (
                                    'Start'
                                  )}
                                </Button>
                              )}
                              {preorder.status === 'in_progress' && (
                                <Button
                                  onClick={() => updatePreOrderStatus(preorder.id, 'completed')}
                                  className="bg-green-500 text-white text-xs px-2 py-1"
                                  size="sm"
                                  disabled={actionLoading.id === preorder.id && actionLoading.type === 'status'}
                                >
                                  {actionLoading.id === preorder.id && actionLoading.type === 'status' ? (
                                    <span className="inline-flex items-center">
                                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Processing...
                                    </span>
                                  ) : (
                                    'Complete'
                                  )}
                                </Button>
                              )}
                              
                              {/* Cancel button - available for pending and in_progress orders */}
                              <Button
                                onClick={() => updatePreOrderStatus(preorder.id, 'cancelled')}
                                className="bg-red-500 text-white text-xs px-2 py-1"
                                size="sm"
                                disabled={actionLoading.id === preorder.id && actionLoading.type === 'status'}
                              >
                                {actionLoading.id === preorder.id && actionLoading.type === 'status' ? (
                                  <span className="inline-flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </span>
                                ) : (
                                  'Cancel Order'
                                )}
                              </Button>
                              
                              {/* Edit button */}
                              <Button
                                onClick={() => editPreOrder(preorder)}
                                className="bg-accent text-white text-xs px-2 py-1"
                                size="sm"
                              >
                                Edit
                              </Button>
                            </>
                          )}
                          
                          {/* Delete button - only for admin, manager, or old completed orders */}
                          {((isAdmin || isManager) || isOverThirtyDays(preorder)) && (
                            <Button
                              onClick={() => deletePreOrder(preorder.id)}
                              className="bg-red-600 text-white text-xs px-2 py-1"
                              size="sm"
                              disabled={actionLoading.id === preorder.id && actionLoading.type === 'delete'}
                            >
                              {actionLoading.id === preorder.id && actionLoading.type === 'delete' ? (
                                <span className="inline-flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Deleting...
                                </span>
                              ) : (
                                'Delete'
                              )}
                            </Button>
                          )}
                            
                          {/* Assignment dropdown (for managers/admins) */}
                          {(isAdmin || isManager) && !preorder.assigned_to && preorder.target_department && preorder.status !== 'cancelled' && preorder.status !== 'completed' && (
                            <select
                              onChange={(e) => {
                                const selectedEmployeeId = parseInt(e.target.value);
                                if (selectedEmployeeId) {
                                  assignPreOrder(preorder.id, selectedEmployeeId);
                                }
                              }}
                              className="mt-2 p-1 text-xs border border-gray-300 rounded"
                              defaultValue=""
                              disabled={actionLoading.id === preorder.id && actionLoading.type === 'assign'}
                            >
                              <option value="" disabled>
                                {actionLoading.id === preorder.id && actionLoading.type === 'assign'
                                  ? 'Assigning...'
                                  : 'Assign to employee'}
                              </option>
                              {employees
                                .filter(emp => emp.department_id === preorder.target_department)
                                .map(emp => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name}
                                  </option>
                                ))
                              }
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredPreOrders.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {pagination.currentPage * pagination.limit + 1} to{' '}
                {Math.min((pagination.currentPage + 1) * pagination.limit, pagination.total)} of{' '}
                {pagination.total} entries
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setPagination(prev => ({
                      ...prev,
                      currentPage: prev.currentPage - 1
                    }));
                  }}
                  disabled={pagination.currentPage === 0}
                  className="px-3 py-1 bg-gray-200 text-gray-800 disabled:bg-gray-100 disabled:text-gray-400"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => {
                    setPagination(prev => ({
                      ...prev,
                      currentPage: prev.currentPage + 1
                    }));
                  }}
                  disabled={(pagination.currentPage + 1) * pagination.limit >= pagination.total}
                  className="px-3 py-1 bg-gray-200 text-gray-800 disabled:bg-gray-100 disabled:text-gray-400"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Confirm Action</h3>
            <p className="mb-6">{confirmDialogText}</p>
            <div className="flex justify-end space-x-3">
              <Button 
                onClick={() => {
                  setIsConfirmDialogOpen(false);
                  setConfirmAction(null);
                }}
                className="bg-gray-300 text-gray-800 hover:bg-gray-400"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmAction}
                className="bg-primary text-white"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}