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
}

interface AnnouncementFormData {
  title: string;
  message: string;
  announcement_type: string;
  target_department: number | null;
  priority: string;
  expires_at: string;
  target_roles: string[];
}

export default function AnnouncementsPage() {
  const { user, isManager, department } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    message: '',
    announcement_type: 'general',
    target_department: null,
    priority: 'normal',
    expires_at: '',
    target_roles: []
  })
  
  useEffect(() => {
    const fetchAnnouncements = async (): Promise<void> => {
      try {
        setLoading(true)
        const response = await api.get('/announcements')
        
        if (response.data && response.data.items) {
          let announcements = response.data.items as Announcement[]
          
          // If not admin, filter announcements
          if (user && user.role !== 'admin' && user.department_id) {
            // Include announcements for user's department and store-wide announcements
            announcements = announcements.filter(a => 
              !a.target_department || a.target_department === user.department_id
            )
          }
          
          setAnnouncements(announcements)
        }
        setLoading(false)
      } catch (err) {
        console.error('Error fetching announcements:', err)
        setError('Failed to load announcements')
        setLoading(false)
      }
    }
    
    fetchAnnouncements()
  }, [user])
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
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
  
  const handleRoleCheckboxChange = (role: string): void => {
    setFormData(prev => {
      const currentRoles = [...prev.target_roles]
      
      if (currentRoles.includes(role)) {
        // Remove role if already selected
        return {
          ...prev,
          target_roles: currentRoles.filter(r => r !== role)
        }
      } else {
        // Add role if not selected
        return {
          ...prev,
          target_roles: [...currentRoles, role]
        }
      }
    })
  }
  
  const handleCreateAnnouncement = async (): Promise<void> => {
    try {
      if (!formData.title || !formData.message) {
        setError('Title and message are required')
        return
      }
      
      const payload = {
        ...formData,
        created_by: user?.id
      }
      
      await api.post('/announcements', payload)
      setShowForm(false)
      
      // Refresh announcements
      const response = await api.get('/announcements')
      if (response.data && response.data.items) {
        setAnnouncements(response.data.items)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error creating announcement:', err)
      setError('Failed to create announcement')
    }
  }
  
  // Helper function to format date
  const formatDate = (dateString: string): string => {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Announcements</h2>
              <p className="text-dark-600">Important announcements and updates for all staff</p>
            </div>
            {isManager && (
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ New Announcement'}
              </Button>
            )}
          </div>
          
          {/* Create announcement form */}
          {showForm && (
            <div className="mb-6 p-4 border border-cream-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Create New Announcement</h3>
              
              {error && (
                <div className="mb-4 p-3 bg-accent-red/10 text-accent-red rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-input w-full"
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
                    className="form-input w-full"
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
                      className="form-input w-full"
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
                      className="form-input w-full"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Department</label>
                    <select
                      name="target_department"
                      value={formData.target_department === null ? '' : formData.target_department.toString()}
                      onChange={handleInputChange}
                      className="form-input w-full"
                    >
                      <option value="">All Departments</option>
                      {user?.department_id && (
                        <option value={user.department_id.toString()}>
                          {department?.name || `Department #${user.department_id}`}
                        </option>
                      )}
                    </select>
                  </div>
                  
                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Expires At</label>
                    <input
                      type="date"
                      name="expires_at"
                      value={formData.expires_at}
                      onChange={handleInputChange}
                      className="form-input w-full"
                    />
                  </div>
                </div>
                
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
                
                <div className="flex justify-end">
                  <Button onClick={handleCreateAnnouncement}>
                    Create Announcement
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
              {announcements.length > 0 ? (
                announcements.map(announcement => (
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
                              {announcement.target_department === user?.department_id 
                                ? department?.name || `Your Department` 
                                : `Dept ${announcement.target_department}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-dark-600 mb-3">{announcement.message}</p>
                      <div className="flex justify-between items-center text-sm text-dark-500">
                        <span>Posted: {formatDate(announcement.created_at)}</span>
                      </div>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-dark-600">No announcements found</div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}