// app/(dashboard)/announcements/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { 
  MessageSquare, 
  ChevronRight, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Filter,
  SortDesc,
  SortAsc,
  Bell,
  Info,
  Users,
  Tag,
  Edit2,
  Trash2,
  ChevronDown,
  Search
} from 'lucide-react'

// Properly align interface with API schema
interface Announcement {
  id: number;
  title: string;
  content: string; // API uses "content" not "message"
  published_by: number; // API uses "published_by" not "created_by"
  start_date: string; // Required field in API
  end_date?: string | null; // API uses "end_date" not "expires_at"
  is_active: boolean;
  priority: string;
  departments?: number[] | null; // API uses "departments" array not "target_department"
  created_at: string;
  
  // Frontend only fields (not in API)
  creator_name?: string;
  announcement_type?: string;
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
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [formData, setFormData] = useState({
    title: '',
    content: '', // Changed from "message" to match API
    announcement_type: 'general', // Frontend-only field
    target_department: user?.department_id || null, // Will be transformed to departments array
    priority: 'normal',
    end_date: '', // Changed from "expires_at" to match API
    target_roles: [] as string[], // Frontend-only field
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
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? err.response?.data?.detail?.msg || 'Failed to load announcements'
        : err.response?.data?.detail || 'Failed to load announcements'
      setError(errorMessage)
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
      content: announcement.content, // Changed from message to content
      announcement_type: announcement.announcement_type || 'general',
      target_department: announcement.departments && announcement.departments.length > 0 ? 
        announcement.departments[0] : null, // Convert from array to single value
      priority: announcement.priority || 'normal',
      end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().split('T')[0] : '', // Changed from expires_at
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
      content: '', // Changed from message
      announcement_type: 'general',
      target_department: user?.department_id || null,
      priority: 'normal',
      end_date: '', // Changed from expires_at
      target_roles: [],
      is_active: true
    })
    setError(null)
  }
  
  // Submit announcement (create or update)
  const handleSubmitAnnouncement = async () => {
    try {
      if (!formData.title || !formData.content) {
        setError('Title and content are required')
        return
      }
      
      // Construct the payload according to the API schema
      const payload = {
        title: formData.title,
        content: formData.content, // Changed from message to content
        published_by: user?.id, // Required field in API
        start_date: new Date().toISOString(), // Required field in API
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null, // Changed from expires_at
        priority: formData.priority,
        is_active: formData.is_active,
        departments: formData.target_department ? [formData.target_department] : null // Convert to array
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
        content: '',
        announcement_type: 'general',
        target_department: user?.department_id || null,
        priority: 'normal',
        end_date: '',
        target_roles: [],
        is_active: true
      })
      
      // Refresh announcements
      fetchAnnouncements()
      setError(null)
    } catch (err: any) {
      console.error('Error submitting announcement:', err)
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? err.response?.data?.detail?.msg || 'Failed to save announcement'
        : err.response?.data?.detail || 'Failed to save announcement'
      setError(errorMessage)
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
      const errorMessage = typeof err.response?.data?.detail === 'object' 
        ? err.response?.data?.detail?.msg || 'Failed to delete announcement'
        : err.response?.data?.detail || 'Failed to delete announcement'
      setError(errorMessage)
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

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  // Get priority color class
  const getPriorityColorClass = (priority: string) => {
    switch(priority) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-amber-500 text-white';
      case 'normal':
        return 'bg-blue-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  }

  // Get announcement type icon
  const getAnnouncementTypeIcon = (type: string) => {
    switch(type) {
      case 'general':
        return <Info size={16} />;
      case 'policy':
        return <Tag size={16} />;
      case 'event':
        return <Calendar size={16} />;
      case 'maintenance':
        return <AlertTriangle size={16} />;
      case 'emergency':
        return <Bell size={16} />;
      default:
        return <Info size={16} />;
    }
  }

  // Filter and sort announcements
  const filteredAndSortedAnnouncements = useMemo(() => {
    const displayAnnouncements = activeTab === 'unread' 
      ? unreadAnnouncements 
      : announcements;
    
    return displayAnnouncements
      .filter(announcement => {
        const matchesSearch = searchTerm 
          ? announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (announcement.content && announcement.content.toLowerCase().includes(searchTerm.toLowerCase()))
          : true;
        
        const matchesPriority = filterPriority === 'all' 
          ? true 
          : announcement.priority === filterPriority;
        
        const matchesType = filterType === 'all' 
          ? true 
          : announcement.announcement_type === filterType;
        
        return matchesSearch && matchesPriority && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'created_at') {
          return sortOrder === 'asc'
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortBy === 'priority') {
          const priorityOrder = { 'high': 3, 'medium': 2, 'normal': 1, 'low': 0 };
          const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          
          return sortOrder === 'asc'
            ? priorityA - priorityB
            : priorityB - priorityA;
        }
        return 0;
      });
  }, [
    activeTab, 
    announcements, 
    unreadAnnouncements, 
    searchTerm, 
    filterPriority, 
    filterType, 
    sortBy, 
    sortOrder
  ]);

  // Animation variants
  const containerVariants:Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants:Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
    }
  };

  const formVariants:Variants = {
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
  };

  const buttonVariants = {
    hover: { 
      scale: 1.05,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
    },
    tap: { 
      scale: 0.95 
    }
  };

  // Custom select component
  const CustomSelect = ({ 
    value, 
    onChange, 
    options, 
    className = "",
    name = ""
  }: { 
    value: string, 
    onChange: (value: string) => void, 
    options: {value: string, label: string}[],
    className?: string,
    name?: string
  }) => {
    return (
      <div className={`relative ${className}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          name={name}
          className="appearance-none w-full px-4 py-2.5 bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all pr-10"
        >
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
    );
  };

  return (
    <div className="space-y-6 relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card 
          className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl"
          elevation="floating"
        >
          <CardBody className="p-6 md:p-8">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Header section */}
              <motion.div 
                variants={itemVariants}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-[#f7eccf] flex items-center">
                    <MessageSquare className="h-6 w-6 mr-2 text-[#f7eccf]/70" />
                    Announcements
                  </h2>
                  <p className="text-[#f7eccf]/70 mt-1">
                    Important announcements and updates for staff
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {(isManager || isAdmin) && (
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button 
                        onClick={() => {
                          setShowForm(!showForm)
                          setEditingAnnouncement(null)
                          if (!showForm) {
                            setFormData({
                              title: '',
                              content: '',
                              announcement_type: 'general',
                              target_department: user?.department_id || null,
                              priority: 'normal',
                              end_date: '',
                              target_roles: [],
                              is_active: true
                            })
                          }
                        }}
                        variant="accent"
                        className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                      >
                        {showForm && !editingAnnouncement ? (
                          <>
                            <XCircle size={16} />
                            <span>Cancel</span>
                          </>
                        ) : (
                          <>
                            <Plus size={16} />
                            <span>New Announcement</span>
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
              
              {/* Search and filter section */}
              <motion.div 
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
              >
                <div className="md:col-span-2">
                  <div className="relative rounded-full shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search size={16} className="text-[#f7eccf]/50" />
                    </div>
                    <input
                      type="search"
                      placeholder="Search announcements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all placeholder:text-[#f7eccf]/50"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <CustomSelect
                    value={filterPriority}
                    onChange={(value) => setFilterPriority(value)}
                    name="filterPriority"
                    options={[
                      { value: 'all', label: 'All Priorities' },
                      { value: 'high', label: 'High Priority' },
                      { value: 'medium', label: 'Medium Priority' },
                      { value: 'normal', label: 'Normal Priority' },
                      { value: 'low', label: 'Low Priority' }
                    ]}
                    className="flex-1"
                  />
                  
                  <CustomSelect
                    value={filterType}
                    onChange={(value) => setFilterType(value)}
                    name="filterType"
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'general', label: 'General' },
                      { value: 'policy', label: 'Policy Change' },
                      { value: 'event', label: 'Event' },
                      { value: 'maintenance', label: 'Maintenance' },
                      { value: 'emergency', label: 'Emergency' }
                    ]}
                    className="flex-1"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <CustomSelect
                    value={sortBy}
                    onChange={(value) => setSortBy(value)}
                    name="sortBy"
                    options={[
                      { value: 'created_at', label: 'Sort by Date' },
                      { value: 'priority', label: 'Sort by Priority' }
                    ]}
                    className="flex-1"
                  />
                  
                  <motion.button
                    onClick={toggleSortOrder}
                    className="p-2.5 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 w-11 h-11 flex items-center justify-center shadow-sm"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Tabs */}
              <motion.div 
                variants={itemVariants}
                className="relative flex border-b border-[#f7eccf]/20 mt-2"
              >
                <button
                  className={`relative px-6 py-3 font-medium text-sm transition-colors duration-200 ease-in-out ${
                    activeTab === 'all' 
                      ? 'text-[#f7eccf]' 
                      : 'text-[#f7eccf]/60 hover:text-[#f7eccf]/80'
                  }`}
                  onClick={() => setActiveTab('all')}
                >
                  All Announcements
                  {activeTab === 'all' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f7eccf]"
                      layoutId="tabIndicator"
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                    />
                  )}
                </button>
                
                <button
                  className={`relative px-6 py-3 font-medium text-sm transition-colors duration-200 ease-in-out flex items-center ${
                    activeTab === 'unread' 
                      ? 'text-[#f7eccf]' 
                      : 'text-[#f7eccf]/60 hover:text-[#f7eccf]/80'
                  }`}
                  onClick={() => setActiveTab('unread')}
                >
                  Unread
                  {unreadAnnouncements.length > 0 && (
                    <span className="ml-2 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">
                      {unreadAnnouncements.length}
                    </span>
                  )}
                  {activeTab === 'unread' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f7eccf]"
                      layoutId="tabIndicator"
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                    />
                  )}
                </button>
              </motion.div>
              
              {/* Error display */}
              {error && (
                <motion.div 
                  variants={itemVariants}
                  className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-500 flex items-center"
                >
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span>{error}</span>
                </motion.div>
              )}
              
              {/* Create/Edit announcement form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div 
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-6 bg-[#f7eccf]/10 border border-[#f7eccf]/20 rounded-3xl shadow-lg"
                  >
                    <h3 className="text-lg font-semibold text-[#f7eccf] mb-5 flex items-center">
                      {editingAnnouncement ? (
                        <>
                          <Bell className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                          Edit Announcement
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                          Create New Announcement
                        </>
                      )}
                    </h3>
                    
                    <div className="space-y-5">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Title</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      
                      {/* Content - renamed from Message to match API */}
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Content</label>
                        <textarea
                          name="content" 
                          value={formData.content}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-2xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                          required
                        ></textarea>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Type */}
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Type</label>
                          <CustomSelect
                            value={formData.announcement_type}
                            onChange={(value) => setFormData(prev => ({ ...prev, announcement_type: value }))}
                            name="announcement_type"
                            options={[
                              { value: 'general', label: 'General' },
                              { value: 'policy', label: 'Policy Change' },
                              { value: 'event', label: 'Event' },
                              { value: 'maintenance', label: 'Maintenance' },
                              { value: 'emergency', label: 'Emergency' }
                            ]}
                          />
                        </div>
                        
                        {/* Priority */}
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Priority</label>
                          <CustomSelect
                            value={formData.priority}
                            onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                            name="priority"
                            options={[
                              { value: 'low', label: 'Low' },
                              { value: 'normal', label: 'Normal' },
                              { value: 'medium', label: 'Medium' },
                              { value: 'high', label: 'High' }
                            ]}
                          />
                        </div>
                        
                        {/* Department - Only visible to admins and managers */}
                        {(isAdmin || isManager) && (
                          <div>
                            <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">Target Department</label>
                            <CustomSelect
                              value={formData.target_department === null ? '' : formData.target_department.toString()}
                              onChange={(value) => setFormData(prev => ({ 
                                ...prev, 
                                target_department: value === '' ? null : Number(value) 
                              }))}
                              name="target_department"
                              options={[
                                { value: '', label: 'All Departments' },
                                ...(department ? [{ value: department.id.toString(), label: department.name }] : [])
                              ]}
                            />
                          </div>
                        )}
                        
                        {/* Expiration - renamed to end_date to match API */}
                        <div>
                          <label className="block text-sm font-medium mb-1.5 text-[#f7eccf]/80">End Date</label>
                          <div className="relative">
                            <input
                              type="date"
                              name="end_date"
                              value={formData.end_date}
                              onChange={handleInputChange}
                              className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-full text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/70">
                              <Calendar size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Target Roles - Only visible to admins and managers */}
                      {(isAdmin || isManager) && (
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[#f7eccf]/80">Target Roles</label>
                          <div className="flex flex-wrap gap-4 p-4 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-2xl">
                            {['admin', 'manager', 'lead', 'staff'].map(role => (
                              <div key={role} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`role-${role}`}
                                  checked={formData.target_roles.includes(role)}
                                  onChange={() => handleRoleCheckboxChange(role)}
                                  className="mr-2 h-4 w-4 rounded border-[#f7eccf]/20 bg-[#f7eccf]/5 checked:bg-[#f7eccf] checked:border-transparent focus:ring-[#f7eccf] focus:ring-offset-[#1C1C1C]"
                                />
                                <label htmlFor={`role-${role}`} className="text-[#f7eccf]/80">{role.charAt(0).toUpperCase() + role.slice(1)}</label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-[#f7eccf]/50 mt-1.5">Leave empty to target all roles</p>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-3 mt-3">
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button 
                            variant="outline"
                            className="border-[#f7eccf]/50 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-full px-5 py-2.5"
                            onClick={handleCancel}
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
                            className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full shadow-md px-5 py-2.5"
                            onClick={handleSubmitAnnouncement}
                          >
                            {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Announcements list */}
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
                  <p className="mt-4 text-[#f7eccf]/70">Loading announcements...</p>
                </motion.div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  className="space-y-4"
                >
                  {filteredAndSortedAnnouncements.length > 0 ? (
                    filteredAndSortedAnnouncements.map(announcement => (
                      <motion.div
                        key={announcement.id}
                        variants={itemVariants}
                        whileHover={{ 
                          y: -5,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <Card className="overflow-hidden border-none bg-[#f7eccf]/10 backdrop-blur-sm hover:bg-[#f7eccf]/15 transition-all duration-300 rounded-3xl shadow-lg">
                          <div className={`h-1.5 ${
                            announcement.priority === 'high' 
                              ? 'bg-red-500' 
                              : announcement.priority === 'medium'
                              ? 'bg-amber-500'
                              : announcement.priority === 'normal'
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                          }`}></div>
                          <CardBody className="p-5">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-start gap-2 mb-3">
                                  <h3 className="text-lg font-semibold text-[#f7eccf]">{announcement.title}</h3>
                                  <div className="flex flex-wrap gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs rounded-full ${getPriorityColorClass(announcement.priority)}`}>
                                      {announcement.priority}
                                    </span>
                                    
                                    {announcement.announcement_type && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-[#f7eccf]/20 text-[#f7eccf]">
                                        {getAnnouncementTypeIcon(announcement.announcement_type)}
                                        <span className="capitalize">{announcement.announcement_type}</span>
                                      </span>
                                    )}
                                    
                                    {announcement.departments && announcement.departments.length > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-500">
                                        <Users size={12} />
                                        {announcement.target_department_name || `Dept ${announcement.departments[0]}`}
                                      </span>
                                    )}
                                    
                                    {announcement.target_roles && announcement.target_roles.length > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-500">
                                        <Users size={12} />
                                        For: {announcement.target_roles.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-[#f7eccf]/80 mb-4 text-sm">{announcement.content}</p>
                                
                                <div className="flex flex-wrap gap-3 text-xs text-[#f7eccf]/60">
                                  <span className="flex items-center">
                                    <Calendar size={12} className="mr-1.5" />
                                    Posted: {formatDate(announcement.created_at)}
                                  </span>
                                  
                                  {announcement.end_date && (
                                    <span className="flex items-center">
                                      <Clock size={12} className="mr-1.5" />
                                      Expires: {formatDate(announcement.end_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-row md:flex-col justify-end gap-2 mt-2 md:mt-0">
                                {/* Mark as read button - Only for unread announcements */}
                                {activeTab === 'unread' && (
                                  <motion.div
                                    variants={buttonVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                    className="ml-auto md:ml-0"
                                  >
                                    <button 
                                      className="flex items-center gap-1.5 px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium rounded-full shadow-md hover:bg-[#e9d8ae] transition-colors"
                                      onClick={() => markAsRead(announcement.id)}
                                    >
                                      <CheckCircle size={14} />
                                      Mark as Read
                                    </button>
                                  </motion.div>
                                )}
                                
                                {/* Edit/Delete buttons - Only for managers/admins */}
                                {(isManager || isAdmin) && (
                                  <div className="flex md:flex-col gap-2 ml-auto md:ml-0">
                                    <motion.div
                                      variants={buttonVariants}
                                      whileHover="hover"
                                      whileTap="tap"
                                    >
                                      <button
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] text-sm font-medium rounded-full border border-[#f7eccf]/30 hover:bg-[#f7eccf]/20 transition-colors"
                                        onClick={() => handleEdit(announcement)}
                                      >
                                        <Edit2 size={14} />
                                        Edit
                                      </button>
                                    </motion.div>
                                    
                                    {/* Delete with confirmation */}
                                    {deleteConfirmId === announcement.id ? (
                                      <div className="flex gap-1">
                                        <motion.div
                                          variants={buttonVariants}
                                          whileHover="hover"
                                          whileTap="tap"
                                        >
                                          <button
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-full shadow-md hover:bg-red-600 transition-colors"
                                            onClick={() => handleDelete(announcement.id)}
                                          >
                                            <CheckCircle size={14} />
                                            Confirm
                                          </button>
                                        </motion.div>
                                        
                                        <motion.div
                                          variants={buttonVariants}
                                          whileHover="hover"
                                          whileTap="tap"
                                        >
                                          <button
                                            className="flex items-center gap-1.5 px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] text-sm font-medium rounded-full border border-[#f7eccf]/30 hover:bg-[#f7eccf]/20 transition-colors"
                                            onClick={() => setDeleteConfirmId(null)}
                                          >
                                            <XCircle size={14} />
                                            Cancel
                                          </button>
                                        </motion.div>
                                      </div>
                                    ) : (
                                      <motion.div
                                        variants={buttonVariants}
                                        whileHover="hover"
                                        whileTap="tap"
                                      >
                                        <button
                                          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-500 text-sm font-medium rounded-full border border-red-500/30 hover:bg-red-500/20 transition-colors"
                                          onClick={() => setDeleteConfirmId(announcement.id)}
                                        >
                                          <Trash2 size={14} />
                                          Delete
                                        </button>
                                      </motion.div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div 
                      variants={itemVariants}
                      className="flex flex-col items-center justify-center py-16 bg-[#f7eccf]/5 rounded-3xl"
                    >
                      {activeTab === 'unread' ? (
                        <>
                          <CheckCircle size={48} className="text-green-500 mb-3" />
                          <h3 className="text-xl font-semibold text-[#f7eccf] mb-1">All caught up!</h3>
                          <p className="text-[#f7eccf]/70">You have no unread announcements</p>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={48} className="text-[#f7eccf]/30 mb-3" />
                          <h3 className="text-xl font-semibold text-[#f7eccf] mb-1">No announcements found</h3>
                          <p className="text-[#f7eccf]/70">
                            {searchTerm || filterPriority !== 'all' || filterType !== 'all' 
                              ? 'Try adjusting your search or filters' 
                              : 'There are no announcements at this time'}
                          </p>
                        </>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}