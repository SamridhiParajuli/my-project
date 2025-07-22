// app/(dashboard)/complaints/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import SearchBar from '@/components/ui/SearchBar'
import { AlertCircle, Trash2, AlertTriangle } from 'lucide-react'

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
        <h1 className="text-2xl font-semibold text-primary">Customer Complaints</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white"
        >
          {showForm ? 'Cancel' : 'Report New Complaint'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Report New Complaint</h2>
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
                  Complaint Type*
                </label>
                <select
                  name="complaint_type"
                  value={formData.complaint_type}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="product_quality">Product Quality</option>
                  <option value="customer_service">Customer Service</option>
                  <option value="store_experience">Store Experience</option>
                  <option value="price_discrepancy">Price Discrepancy</option>
                  <option value="product_availability">Product Availability</option>
                  <option value="returns_refunds">Returns/Refunds</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Department Involved*
                </label>
                <select
                  name="department_involved"
                  value={formData.department_involved || ''}
                  onChange={handleInputChange}
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
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {(isAdmin || isManager) && (
                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="is_private"
                    name="is_private"
                    checked={formData.is_private || formData.severity === 'high'}
                    onChange={handleInputChange}
                    disabled={formData.severity === 'high'} // Auto-checked for high severity
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="is_private" className="ml-2 block text-sm text-primary">
                    Mark as Private (Only visible to managers and admins)
                    {formData.severity === 'high' && <span className="text-red-500 ml-1">(Required for high severity)</span>}
                  </label>
                </div>
              )}

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

              <div className="md:col-span-2 flex space-x-2">
                <Button
                  onClick={handleCreateComplaint}
                  className="bg-primary text-white"
                >
                  Submit Complaint
                </Button>
                <Button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-800"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('open')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'open'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Open
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
              onClick={() => setActiveTab('resolved')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'resolved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Resolved
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
          <SearchBar
            placeholder="Search complaints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          {filteredComplaints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No complaints found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredComplaints.map(complaint => (
                <Card 
                  key={complaint.id} 
                  className={`${complaint.severity === 'high' ? 'border-l-4 border-red-500' : 
                               complaint.severity === 'medium' ? 'border-l-4 border-yellow-500' : 
                               'border-l-4 border-green-500'}`}
                >
                  <CardBody>
                    {/* Resolution form */}
                    {showResolutionForm === complaint.id && (
                      <div className="bg-gray-50 p-4 mb-4 rounded-md">
                        <h4 className="font-medium mb-2">Add Resolution</h4>
                        <textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          className="w-full p-2 border rounded-md mb-2"
                          placeholder="Enter resolution details..."
                          rows={3}
                        ></textarea>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleResolveWithComment(complaint.id)}
                            className="bg-green-500 text-white"
                            size="sm"
                          >
                            Resolve
                          </Button>
                          <Button
                            onClick={() => setShowResolutionForm(null)}
                            className="bg-gray-300 text-gray-700"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Delete confirmation */}
                    {deleteConfirmId === complaint.id && (
                      <div className="bg-red-50 p-4 mb-4 rounded-md">
                        <div className="flex items-center mb-2">
                          <AlertTriangle className="text-red-500 mr-2" size={20} />
                          <h4 className="font-medium text-red-800">Confirm Deletion</h4>
                        </div>
                        <p className="text-sm text-red-700 mb-3">
                          Are you sure you want to delete this complaint? This action cannot be undone.
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => deleteComplaint(complaint.id)}
                            className="bg-red-500 text-white"
                            size="sm"
                          >
                            Delete
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmId(null)}
                            className="bg-gray-300 text-gray-700"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-primary">
                            {complaint.customer_name}
                          </h3>
                          {complaint.is_private && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                              PRIVATE
                            </span>
                          )}
                          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                            complaint.severity === 'high' ? 'bg-red-500 text-white' :
                            complaint.severity === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-green-500 text-white'
                          }`}>
                            {complaint.severity.toUpperCase()}
                          </span>
                          <span className={`ml-2 px-3 py-1 text-xs font-semibold rounded-full ${
                            complaint.status === 'open' ? 'bg-red-100 text-red-800' :
                            complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {complaint.status === 'open' ? 'OPEN' :
                            complaint.status === 'in_progress' ? 'IN PROGRESS' :
                            'RESOLVED'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{complaint.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                          <div>
                            <span className="font-semibold">Type:</span> {formatComplaintType(complaint.complaint_type)}
                          </div>
                          <div>
                            <span className="font-semibold">Department:</span> {complaint.department_involved_name || 'Not specified'}
                          </div>
                          <div>
                            <span className="font-semibold">Reported by:</span> {complaint.reported_by_name || `Employee ID: ${complaint.reported_by}`}
                          </div>
                          <div>
                            <span className="font-semibold">Assigned to:</span> {complaint.assigned_to_name || 'Unassigned'}
                          </div>
                          <div>
                            <span className="font-semibold">Created:</span> {new Date(complaint.created_at).toLocaleDateString()}
                          </div>
                          {complaint.resolved_at && (
                            <div>
                              <span className="font-semibold">Resolved:</span> {new Date(complaint.resolved_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        {complaint.resolution && (
                          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded mb-2">
                            <span className="font-semibold">Resolution:</span> {complaint.resolution}
                          </div>
                        )}
                        
                        {complaint.customer_email && (
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="font-semibold">Email:</span> {complaint.customer_email}
                          </div>
                        )}
                        
                        {complaint.customer_phone && (
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="font-semibold">Phone:</span> {complaint.customer_phone}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col justify-between mt-4 md:mt-0 md:ml-4 min-w-[130px]">
                        {/* Status update buttons */}
                        {complaint.status !== 'resolved' && (
                          <div className="flex flex-col space-y-2">
                            {complaint.status === 'open' && (
                              <Button
                                onClick={() => updateComplaintStatus(complaint.id, 'in_progress')}
                                className="bg-blue-500 text-white text-xs px-2 py-1"
                                size="sm"
                              >
                                Start
                              </Button>
                            )}
                            
                            {complaint.status === 'in_progress' && (
                              <Button
                                onClick={() => updateComplaintStatus(complaint.id, 'resolved')}
                                className="bg-green-500 text-white text-xs px-2 py-1"
                                size="sm"
                              >
                                Resolve
                              </Button>
                            )}
                            
                            {/* Assignment dropdown (for managers/admins) */}
                            {(isAdmin || isManager) && !complaint.assigned_to && complaint.department_involved && (
                              <select
                                onChange={(e) => {
                                  const selectedEmployeeId = parseInt(e.target.value);
                                  if (selectedEmployeeId) {
                                    assignComplaint(complaint.id, selectedEmployeeId);
                                  }
                                }}
                                className="mt-2 p-1 text-xs border border-gray-300 rounded"
                                defaultValue=""
                              >
                                <option value="" disabled>Assign to employee</option>
                                {employees
                                  .filter(emp => emp.department_id === complaint.department_involved)
                                  .map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.first_name} {emp.last_name}
                                    </option>
                                  ))
                                }
                              </select>
                            )}
                            
                            {/* Privacy toggle (for managers/admins) */}
                            {(isAdmin || isManager) && complaint.severity !== 'high' && (
                              <Button
                                onClick={() => togglePrivacy(complaint.id, !complaint.is_private)}
                                className={`${complaint.is_private ? 'bg-gray-300' : 'bg-gray-500'} text-white text-xs px-2 py-1 mt-2`}
                                size="sm"
                              >
                                {complaint.is_private ? 'Make Public' : 'Make Private'}
                              </Button>
                            )}
                            
                            {/* Delete button */}
                            {(isAdmin || isManager) && (
                              <Button
                                onClick={() => setDeleteConfirmId(complaint.id)}
                                className="bg-red-500 text-white text-xs px-2 py-1 mt-2 flex items-center justify-center"
                                size="sm"
                              >
                                <Trash2 size={14} className="mr-1" /> Delete
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* For resolved complaints, only show delete button */}
                        {complaint.status === 'resolved' && (isAdmin || isManager) && (
                          <Button
                            onClick={() => setDeleteConfirmId(complaint.id)}
                            className="bg-red-500 text-white text-xs px-2 py-1 mt-2 flex items-center justify-center"
                            size="sm"
                          >
                            <Trash2 size={14} className="mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}