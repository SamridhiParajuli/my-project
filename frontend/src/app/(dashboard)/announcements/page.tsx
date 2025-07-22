// app/(dashboard)/announcements/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'

interface Announcement {
  id: number;
  title: string;
  message: string;
  announcement_type: string;
  target_department?: number | null;
  created_by: number;
  creator_name?: string;
  priority: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  target_roles?: string[];
  target_department_name?: string;
}

export default function AnnouncementsPage() {
  const { user, isManager, isAdmin, department } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [showForm, setShowForm] = useState<boolean>(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    announcement_type: 'general',
    target_department: user?.department_id || null,
    priority: 'normal',
    expires_at: '',
    target_roles: [] as string[],
    is_active: true
  })
  
  // Fetch announcements on component mount
  useEffect(() => {
    fetchAnnouncements()
  }, [user, activeTab])
  
  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      
      // Fetch all announcements
      const response = await api.get('/announcements', { 
        params: { is_active: true }
      })
      
      if (response.data && response.data.items) {
        setAnnouncements(response.data.items)
      }
      
      // Fetch unread announcements specifically for the user
      const unreadResponse = await api.get('/announcements/unread/me')
      if (unreadResponse.data) {
        setUnreadAnnouncements(unreadResponse.data)
      }
      
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching announcements:', err)
      setError(err.response?.data?.detail || 'Failed to load announcements')
      setLoading(false)
    }
  }
  
  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    
    if (name === 'target_department') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }
  
  // Handle role checkbox changes
  const handleRoleCheckboxChange = (role: string) => {
    setFormData(prev => {
      const currentRoles = [...prev.target_roles]
      
      if (currentRoles.includes(role)) {
        return {
          ...prev,
          target_roles: currentRoles.filter(r => r !== role)
        }
      } else {
        return {
          ...prev,
          target_roles: [...currentRoles, role]
        }
      }
    })
  }
  
  // Set up edit form with announcement data
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      announcement_type: announcement.announcement_type,
      target_department: announcement.target_department || null,
      priority: announcement.priority || 'normal',
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().split('T')[0] : '',
      target_roles: announcement.target_roles || [],
      is_active: announcement.is_active
    })
    setShowForm(true)
    setError(null)
  }
  
  // Cancel editing or creating
  const handleCancel = () => {
    setShowForm(false)
    setEditingAnnouncement(null)
    setFormData({
      title: '',
      message: '',
      announcement_type: 'general',
      target_department: user?.department_id || null,
      priority: 'normal',
      expires_at: '',
      target_roles: [],
      is_active: true
    })
    setError(null)
  }
  
  // Submit announcement (create or update)
  const handleSubmitAnnouncement = async () => {
    try {
      if (!formData.title || !formData.message) {
        setError('Title and message are required')
        return
      }
      
      const payload = {
        ...formData,
        created_by: user?.id
      }
      
      if (editingAnnouncement) {
        // Update existing announcement
        await api.put(`/announcements/${editingAnnouncement.id}`, payload)
      } else {
        // Create new announcement
        await api.post('/announcements', payload)
      }
      
      // Reset form and state
      setShowForm(false)
      setEditingAnnouncement(null)
      setFormData({
        title: '',
        message: '',
        announcement_type: 'general',
        target_department: user?.department_id || null,
        priority: 'normal',
        expires_at: '',
        target_roles: [],
        is_active: true
      })
      
      // Refresh announcements
      fetchAnnouncements()
      setError(null)
    } catch (err: any) {
      console.error('Error submitting announcement:', err)
      setError(err.response?.data?.detail || 'Failed to save announcement')
    }
  }
  
  // Delete announcement
  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/announcements/${id}`)
      
      // Refresh announcements
      fetchAnnouncements()
      setDeleteConfirmId(null)
    } catch (err: any) {
      console.error('Error deleting announcement:', err)
      setError(err.response?.data?.detail || 'Failed to delete announcement')
    }
  }
  
  // Mark announcement as read
  const markAsRead = async (announcementId: number) => {
    try {
      await api.post(`/announcements/${announcementId}/read`)
      
      // Update unread announcements list
      setUnreadAnnouncements(prev => 
        prev.filter(a => a.id !== announcementId)
      )
    } catch (err) {
      console.error('Error marking announcement as read:', err)
    }
  }
  
  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date)
    } catch (e) {
      return dateString
    }
  }

  // Filter announcements based on active tab
  const displayAnnouncements = activeTab === 'unread' 
    ? unreadAnnouncements 
    : announcements

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Announcements</h2>
              <p className="text-dark-600">Important announcements and updates for staff</p>
            </div>
            <div className="flex gap-2">
              {(isManager || isAdmin) && (
                <Button onClick={() => {
                  setShowForm(!showForm)
                  setEditingAnnouncement(null)
                  if (!showForm) {
                    setFormData({
                      title: '',
                      message: '',
                      announcement_type: 'general',
                      target_department: user?.department_id || null,
                      priority: 'normal',
                      expires_at: '',
                      target_roles: [],
                      is_active: true
                    })
                  }
                }}>
                  {showForm && !editingAnnouncement ? 'Cancel' : '+ New Announcement'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6">
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'all' 
                  ? 'border-b-2 border-accent-blue text-accent-blue' 
                  : 'text-dark-600 hover:text-dark-800'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All Announcements
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'unread' 
                  ? 'border-b-2 border-accent-blue text-accent-blue' 
                  : 'text-dark-600 hover:text-dark-800'
              }`}
              onClick={() => setActiveTab('unread')}
            >
              Unread ({unreadAnnouncements.length})
            </button>
          </div>
          
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-accent-red/10 text-accent-red rounded-lg">
              {error}
            </div>
          )}
          
          {/* Create/Edit announcement form */}
          {showForm && (
            <div className="mb-6 p-4 border border-cream-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-input w-full p-2 border border-cream-300 rounded-md"
                    required
                  />
                </div>
                
                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    className="form-input w-full p-2 border border-cream-300 rounded-md"
                    required
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      name="announcement_type"
                      value={formData.announcement_type}
                      onChange={handleInputChange}
                      className="form-input w-full p-2 border border-cream-300 rounded-md"
                    >
                      <option value="general">General</option>
                      <option value="policy">Policy Change</option>
                      <option value="event">Event</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="form-input w-full p-2 border border-cream-300 rounded-md"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  {/* Department - Only visible to admins and managers */}
                  {(isAdmin || isManager) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Target Department</label>
                      <select
                        name="target_department"
                        value={formData.target_department === null ? '' : formData.target_department.toString()}
                        onChange={handleInputChange}
                        className="form-input w-full p-2 border border-cream-300 rounded-md"
                      >
                        <option value="">All Departments</option>
                        {department && (
                          <option value={department.id.toString()}>
                            {department.name}
                          </option>
                        )}
                      </select>
                    </div>
                  )}
                  
                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Expires At</label>
                    <input
                      type="date"
                      name="expires_at"
                      value={formData.expires_at}
                      onChange={handleInputChange}
                      className="form-input w-full p-2 border border-cream-300 rounded-md"
                    />
                  </div>
                </div>
                
                {/* Target Roles - Only visible to admins and managers */}
                {(isAdmin || isManager) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Roles</label>
                    <div className="flex flex-wrap gap-4">
                      {['admin', 'manager', 'lead', 'staff'].map(role => (
                        <div key={role} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`role-${role}`}
                            checked={formData.target_roles.includes(role)}
                            onChange={() => handleRoleCheckboxChange(role)}
                            className="mr-2"
                          />
                          <label htmlFor={`role-${role}`}>{role.charAt(0).toUpperCase() + role.slice(1)}</label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-dark-500 mt-1">Leave empty to target all roles</p>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmitAnnouncement}
                  >
                    {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Announcements list */}
          {loading ? (
            <div className="text-center py-8">Loading announcements...</div>
          ) : (
            <div className="space-y-4">
              {displayAnnouncements.length > 0 ? (
                displayAnnouncements.map(announcement => (
                  <Card key={announcement.id} className="overflow-hidden border border-cream-200">
                    <div className={`h-1 ${
                      announcement.priority === 'high' 
                        ? 'bg-accent-red' 
                        : announcement.priority === 'medium'
                        ? 'bg-gold'
                        : 'bg-accent-green'
                    }`}></div>
                    <CardBody className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-dark-800">{announcement.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            announcement.priority === 'high' 
                              ? 'bg-accent-red/10 text-accent-red' 
                              : announcement.priority === 'medium'
                              ? 'bg-gold/10 text-gold'
                              : 'bg-accent-green/10 text-accent-green'
                          }`}>
                            {announcement.priority}
                          </span>
                          
                          {announcement.target_department && (
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-accent-blue/10 text-accent-blue">
                              {announcement.target_department_name || `Dept ${announcement.target_department}`}
                            </span>
                          )}
                          
                          {announcement.target_roles && announcement.target_roles.length > 0 && (
                            <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                              For: {announcement.target_roles.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-dark-600 mb-3">{announcement.message}</p>
                      <div className="flex justify-between items-center text-sm text-dark-500">
                        <span>Posted: {formatDate(announcement.created_at)}</span>
                        
                        <div className="flex gap-2">
                          {/* Mark as read button - Only for unread announcements */}
                          {activeTab === 'unread' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markAsRead(announcement.id)}
                            >
                              Mark as Read
                            </Button>
                          )}
                          
                          {/* Edit/Delete buttons - Only for managers/admins */}
                          {(isManager || isAdmin) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(announcement)}
                              >
                                Edit
                              </Button>
                              
                              {/* Delete with confirmation */}
                              {deleteConfirmId === announcement.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(announcement.id)}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteConfirmId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-accent-red"
                                  onClick={() => setDeleteConfirmId(announcement.id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-dark-600">
                  {activeTab === 'unread' 
                    ? 'No unread announcements' 
                    : 'No announcements found'}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}