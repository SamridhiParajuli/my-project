// app/(dashboard)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Variants, Transition } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { 
  Clipboard, AlertCircle, ShoppingBag, MessageSquare,
  ChevronRight, Calendar, Clock, Users, BarChart3,
  CheckCircle, XCircle, AlertTriangle, Package
} from 'lucide-react'

interface DashboardCounts {
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    urgent: number;
  };
  complaints: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
  };
  preorders: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
  announcements: {
    total: number;
    unread: number;
  };
}

interface RecentTask {
  id: number;
  title: string;
  status: string;
  is_urgent: boolean;
  due_date: string | null;
  assigned_to_name?: string;
}

interface RecentComplaint {
  id: number;
  customer_name: string;
  complaint_type: string;
  severity: string;
  status: string;
  created_at: string;
}

interface RecentPreOrder {
  id: number;
  customer_name: string;
  order_type: string;
  status: string;
  pickup_date: string | null;
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
    y: -12,
    scale: 1.02,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    transition: { duration: 0.3 }
  }
}

const contentCardVariants: Variants = {
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

const tabTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30
}

export default function DashboardPage() {
  const { user, isManager, isAdmin, department } = useAuth()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<DashboardCounts>({
    tasks: { total: 0, pending: 0, in_progress: 0, completed: 0, urgent: 0 },
    complaints: { total: 0, open: 0, in_progress: 0, resolved: 0 },
    preorders: { total: 0, pending: 0, in_progress: 0, completed: 0 },
    announcements: { total: 0, unread: 0 }
  })
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [recentComplaints, setRecentComplaints] = useState<RecentComplaint[]>([])
  const [recentPreOrders, setRecentPreOrders] = useState<RecentPreOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        setLoading(true)
        
        // Prepare API endpoints based on user role
        let tasksEndpoint = '/tasks';
        let complaintsEndpoint = '/complaints';
        let preordersEndpoint = '/preorders';
        let tasksParams: any = {};
        let complaintsParams: any = {};
        let preordersParams: any = {};
        
        // For department managers, use the department-specific endpoints
        if (isManager && user.department_id) {
          tasksEndpoint = `/tasks/department/${user.department_id}`;
          complaintsEndpoint = `/complaints/department/${user.department_id}`;
          preordersEndpoint = `/preorders/department/${user.department_id}`;
        } 
        // For regular staff, filter by assigned tasks
        else if (!isAdmin && !isManager && user.employee_id) {
          tasksParams = { assigned_to: user.employee_id };
          complaintsParams = { assigned_to: user.employee_id };
          preordersParams = { assigned_to: user.employee_id };
        }
        
        // Fetch tasks data
        const tasksResponse = await api.get(tasksEndpoint, { params: tasksParams });
        
        // Fetch complaints data
        const complaintsResponse = await api.get(complaintsEndpoint, { params: complaintsParams });
        
        // Fetch preorders data
        const preordersResponse = await api.get(preordersEndpoint, { params: preordersParams });
        
        // Fetch announcements data (all users see all announcements)
        const announcementsResponse = await api.get('/announcements');
        
        // Calculate counts
        if (tasksResponse.data && tasksResponse.data.items) {
          const tasks = tasksResponse.data.items
          
          const taskCounts = {
            total: tasks.length,
            pending: tasks.filter((t: any) => t.status === 'pending').length,
            in_progress: tasks.filter((t: any) => t.status === 'in_progress').length,
            completed: tasks.filter((t: any) => t.status === 'completed').length,
            urgent: tasks.filter((t: any) => t.is_urgent).length
          }
          
          setCounts(prev => ({ ...prev, tasks: taskCounts }))
          
          // Get recent tasks (last 5 non-completed)
          const nonCompletedTasks = tasks
            .filter((t: any) => t.status !== 'completed')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
          
          setRecentTasks(nonCompletedTasks)
        }
        
        if (complaintsResponse.data && complaintsResponse.data.items) {
          const complaints = complaintsResponse.data.items
          
          const complaintCounts = {
            total: complaints.length,
            open: complaints.filter((c: any) => c.status === 'open').length,
            in_progress: complaints.filter((c: any) => c.status === 'in_progress').length,
            resolved: complaints.filter((c: any) => c.status === 'resolved').length
          }
          
          setCounts(prev => ({ ...prev, complaints: complaintCounts }))
          
          // Get recent complaints (last 5 non-resolved)
          const nonResolvedComplaints = complaints
            .filter((c: any) => c.status !== 'resolved')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
          
          setRecentComplaints(nonResolvedComplaints)
        }
        
        if (preordersResponse.data && preordersResponse.data.items) {
          const preorders = preordersResponse.data.items
          
          const preorderCounts = {
            total: preorders.length,
            pending: preorders.filter((p: any) => p.status === 'pending').length,
            in_progress: preorders.filter((p: any) => p.status === 'in_progress').length,
            completed: preorders.filter((p: any) => p.status === 'completed').length
          }
          
          setCounts(prev => ({ ...prev, preorders: preorderCounts }))
          
          // Get recent preorders (last 5 non-completed)
          const nonCompletedPreorders = preorders
            .filter((p: any) => p.status !== 'completed')
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
          
          setRecentPreOrders(nonCompletedPreorders)
        }
        
        if (announcementsResponse.data && announcementsResponse.data.items) {
          const announcements = announcementsResponse.data.items
          
          // Count unread announcements
          const unreadCount = announcements.filter((a: any) => !a.is_read).length
          
          setCounts(prev => ({ 
            ...prev, 
            announcements: {
              total: announcements.length,
              unread: unreadCount
            }
          }))
        }
        
        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err)
        setError(err.response?.data?.detail || 'Failed to load dashboard data')
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, isManager, isAdmin])

  // Formatted date for header
  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCompletionPercentage = (section: string) => {
    switch (section) {
      case 'tasks':
        const totalTasks = counts.tasks.total || 1; // Avoid division by zero
        return Math.round((counts.tasks.completed / totalTasks) * 100);
      case 'complaints':
        const totalComplaints = counts.complaints.total || 1;
        return Math.round((counts.complaints.resolved / totalComplaints) * 100);
      case 'preorders':
        const totalPreorders = counts.preorders.total || 1;
        return Math.round((counts.preorders.completed / totalPreorders) * 100);
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div 
          className="rounded-full h-16 w-16 border-t-4 border-b-4 border-[#1C1C1C]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
        />
      </div>
    )
  }

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Stats Overview - redesigned with dark theme cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                variants={itemVariants} 
                className="relative"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1C] to-[#2a2a2a] rounded-3xl transform rotate-1 opacity-20"></div>
                <motion.div 
                  className="bg-[#1C1C1C] rounded-3xl shadow-xl p-6 relative z-10"
                  variants={cardVariants}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm uppercase tracking-wider text-[#f7eccf]/70">Tasks</h3>
                      <p className="text-3xl font-bold text-[#f7eccf] mt-1">{counts.tasks.total}</p>
                    </div>
                    <div className="p-3 bg-[#f7eccf]/10 rounded-2xl">
                      <Clipboard className="h-6 w-6 text-[#f7eccf]" />
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#f7eccf]/70">Progress</span>
                      <span className="text-[#f7eccf]">{getCompletionPercentage('tasks')}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#f7eccf]/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${getCompletionPercentage('tasks')}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-[#f7eccf]">{counts.tasks.pending}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Pending</span>
                    </div>
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-[#f7eccf]">{counts.tasks.in_progress}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Active</span>
                    </div>
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-amber-500">{counts.tasks.urgent}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Urgent</span>
                    </div>
                  </div>
                  
                  <Link href="/tasks">
                    <motion.button
                      className="mt-6 w-full py-2.5 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center justify-center gap-2 shadow-lg"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      View Tasks <ChevronRight size={16} />
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div 
                variants={itemVariants} 
                className="relative"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1C] to-[#2a2a2a] rounded-3xl transform -rotate-1 opacity-20"></div>
                <motion.div 
                  className="bg-[#1C1C1C] rounded-3xl shadow-xl p-6 relative z-10"
                  variants={cardVariants}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm uppercase tracking-wider text-[#f7eccf]/70">Complaints</h3>
                      <p className="text-3xl font-bold text-[#f7eccf] mt-1">{counts.complaints.total}</p>
                    </div>
                    <div className="p-3 bg-[#f7eccf]/10 rounded-2xl">
                      <AlertCircle className="h-6 w-6 text-[#f7eccf]" />
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#f7eccf]/70">Resolution</span>
                      <span className="text-[#f7eccf]">{getCompletionPercentage('complaints')}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#f7eccf]/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-red-400 to-red-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${getCompletionPercentage('complaints')}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-[#f7eccf]">{counts.complaints.open}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Open</span>
                    </div>
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-[#f7eccf]">{counts.complaints.in_progress}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">In Progress</span>
                    </div>
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-green-500">{counts.complaints.resolved}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Resolved</span>
                    </div>
                  </div>
                  
                  <Link href="/complaints">
                    <motion.button
                      className="mt-6 w-full py-2.5 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center justify-center gap-2 shadow-lg"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      View Complaints <ChevronRight size={16} />
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div 
                variants={itemVariants} 
                className="relative"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1C] to-[#2a2a2a] rounded-3xl transform rotate-1 opacity-20"></div>
                <motion.div 
                  className="bg-[#1C1C1C] rounded-3xl shadow-xl p-6 relative z-10"
                  variants={cardVariants}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm uppercase tracking-wider text-[#f7eccf]/70">Pre-Orders</h3>
                      <p className="text-3xl font-bold text-[#f7eccf] mt-1">{counts.preorders.total}</p>
                    </div>
                    <div className="p-3 bg-[#f7eccf]/10 rounded-2xl">
                      <Package className="h-6 w-6 text-[#f7eccf]" />
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#f7eccf]/70">Completion</span>
                      <span className="text-[#f7eccf]">{getCompletionPercentage('preorders')}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#f7eccf]/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${getCompletionPercentage('preorders')}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-[#f7eccf]">{counts.preorders.pending}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Pending</span>
                    </div>
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-[#f7eccf]">{counts.preorders.in_progress}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">In Progress</span>
                    </div>
                    <div className="bg-[#f7eccf]/5 rounded-xl p-2 text-center">
                      <span className="block text-xl font-semibold text-blue-500">{counts.preorders.completed}</span>
                      <span className="block text-xs text-[#f7eccf]/70 mt-1">Completed</span>
                    </div>
                  </div>
                  
                  <Link href="/preorders">
                    <motion.button
                      className="mt-6 w-full py-2.5 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center justify-center gap-2 shadow-lg"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      View Pre-Orders <ChevronRight size={16} />
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div 
                variants={itemVariants} 
                className="relative"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1C] to-[#2a2a2a] rounded-3xl transform -rotate-1 opacity-20"></div>
                <motion.div 
                  className="bg-[#1C1C1C] rounded-3xl shadow-xl p-6 relative z-10"
                  variants={cardVariants}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm uppercase tracking-wider text-[#f7eccf]/70">Announcements</h3>
                      <p className="text-3xl font-bold text-[#f7eccf] mt-1">{counts.announcements.total}</p>
                    </div>
                    <div className="p-3 bg-[#f7eccf]/10 rounded-2xl">
                      <MessageSquare className="h-6 w-6 text-[#f7eccf]" />
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#f7eccf]/70">Read Status</span>
                      <span className="text-[#f7eccf]">{counts.announcements.total > 0 ? Math.round(((counts.announcements.total - counts.announcements.unread) / counts.announcements.total) * 100) : 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#f7eccf]/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600"
                        initial={{ width: 0 }}
                        animate={{ width: counts.announcements.total > 0 ? `${((counts.announcements.total - counts.announcements.unread) / counts.announcements.total) * 100}%` : '0%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-[#f7eccf]/5 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${counts.announcements.unread > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                      <span className="text-lg font-semibold text-[#f7eccf]">{counts.announcements.unread}</span>
                    </div>
                    <span className="block text-xs text-[#f7eccf]/70 mt-1">Unread Announcements</span>
                  </div>
                  
                  <Link href="/announcements">
                    <motion.button
                      className="mt-6 w-full py-2.5 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center justify-center gap-2 shadow-lg"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      View Announcements <ChevronRight size={16} />
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* Recent activity section - redesigned with elegant cards */}
            <motion.div 
              variants={itemVariants}
              whileHover="hover"
            >
              <motion.div 
                className="p-6 bg-[#1C1C1C] rounded-3xl shadow-xl"
                variants={contentCardVariants}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-[#f7eccf]">Recent Activity</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#f7eccf]/70">{formatDate()}</span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Tasks */}
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[#f7eccf] font-medium flex items-center">
                        <Clipboard size={16} className="mr-2 text-amber-500" />
                        Recent Tasks
                      </h3>
                      <motion.button 
                        onClick={() => setActiveTab('tasks')}
                        className="text-amber-500 text-xs font-medium flex items-center"
                        whileHover={{ x: 3 }}
                      >
                        View All <ChevronRight size={14} />
                      </motion.button>
                    </div>
                    
                    {recentTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 bg-[#f7eccf]/5 rounded-xl">
                        <CheckCircle size={24} className="text-green-500 mb-2" />
                        <p className="text-[#f7eccf]/70 text-sm">All tasks completed</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentTasks.slice(0, 3).map(task => (
                          <motion.div 
                            key={task.id} 
                            className="p-3 rounded-xl bg-[#f7eccf]/10 hover:bg-[#f7eccf]/15 transition-colors"
                            whileHover={{ 
                              x: 5, 
                              y: -3,
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                              transition: { duration: 0.2 }
                            }}
                          >
                            <div className="flex justify-between">
                              <div className="flex-1">
                                <h3 className="text-sm font-medium text-[#f7eccf] flex items-center">
                                  {task.title}
                                  {task.is_urgent && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">
                                      URGENT
                                    </span>
                                  )}
                                </h3>
                                <div className="flex items-center mt-2 text-xs text-[#f7eccf]/50">
                                  <Clock size={12} className="mr-1" />
                                  {task.status === 'pending' ? 'Pending' : 'In Progress'}
                                  {task.due_date && (
                                    <span className="flex items-center ml-3">
                                      <Calendar size={12} className="mr-1" />
                                      {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Complaints */}
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[#f7eccf] font-medium flex items-center">
                        <AlertCircle size={16} className="mr-2 text-red-500" />
                        Recent Complaints
                      </h3>
                      <motion.button 
                        onClick={() => setActiveTab('complaints')}
                        className="text-red-500 text-xs font-medium flex items-center"
                        whileHover={{ x: 3 }}
                      >
                        View All <ChevronRight size={14} />
                      </motion.button>
                    </div>
                    
                    {recentComplaints.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 bg-[#f7eccf]/5 rounded-xl">
                        <CheckCircle size={24} className="text-green-500 mb-2" />
                        <p className="text-[#f7eccf]/70 text-sm">No active complaints</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentComplaints.slice(0, 3).map(complaint => (
                          <motion.div 
                            key={complaint.id} 
                            className="p-3 rounded-xl bg-[#f7eccf]/10 hover:bg-[#f7eccf]/15 transition-colors"
                            whileHover={{ 
                              x: 5, 
                              y: -3,
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                              transition: { duration: 0.2 }
                            }}
                          >
                            <div className="flex justify-between">
                              <div className="flex-1">
                                <h3 className="text-sm font-medium text-[#f7eccf] flex items-center">
                                  {complaint.customer_name}
                                  {complaint.severity === 'high' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">
                                      HIGH
                                    </span>
                                  )}
                                </h3>
                                <div className="flex items-center mt-2 text-xs text-[#f7eccf]/50">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                                    complaint.status === 'open' 
                                      ? 'bg-red-500/20 text-red-500' 
                                      : 'bg-blue-500/20 text-blue-500'
                                  }`}>
                                    {complaint.status === 'open' ? 'Open' : 'In Progress'}
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span className="capitalize">
                                    {complaint.complaint_type.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Pre-Orders */}
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[#f7eccf] font-medium flex items-center">
                        <Package size={16} className="mr-2 text-blue-500" />
                        Recent Pre-Orders
                      </h3>
                      <motion.button 
                        onClick={() => setActiveTab('preorders')}
                        className="text-blue-500 text-xs font-medium flex items-center"
                        whileHover={{ x: 3 }}
                      >
                        View All <ChevronRight size={14} />
                      </motion.button>
                    </div>
                    
                    {recentPreOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 bg-[#f7eccf]/5 rounded-xl">
                        <CheckCircle size={24} className="text-green-500 mb-2" />
                        <p className="text-[#f7eccf]/70 text-sm">No pending pre-orders</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentPreOrders.slice(0, 3).map(preorder => (
                          <motion.div 
                            key={preorder.id} 
                            className="p-3 rounded-xl bg-[#f7eccf]/10 hover:bg-[#f7eccf]/15 transition-colors"
                            whileHover={{ 
                              x: 5, 
                              y: -3,
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                              transition: { duration: 0.2 }
                            }}
                          >
                            <div className="flex justify-between">
                              <div className="flex-1">
                                <h3 className="text-sm font-medium text-[#f7eccf]">
                                  {preorder.customer_name}
                                </h3>
                                <div className="flex items-center mt-2 text-xs text-[#f7eccf]/50">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                                    preorder.status === 'pending' 
                                      ? 'bg-amber-500/20 text-amber-500' 
                                      : 'bg-blue-500/20 text-blue-500'
                                  }`}>
                                    {preorder.status === 'pending' ? 'Pending' : 'In Progress'}
                                  </span>
                                  <span className="mx-2">•</span>
                                  <span className="capitalize">
                                    {preorder.order_type.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        );
      
      case 'tasks':
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden"
            whileHover={{ 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              y: -5,
              transition: { duration: 0.3 }
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#f7eccf] flex items-center">
                  <Clipboard size={20} className="mr-2 text-amber-500" />
                  Tasks
                </h2>
                <Link href="/tasks">
                  <motion.button
                    className="py-2 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center gap-1 shadow-md"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    Go to Tasks <ChevronRight size={16} />
                  </motion.button>
                </Link>
              </div>
              
              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[#f7eccf]/5 rounded-2xl">
                  <CheckCircle size={40} className="text-green-500 mb-3" />
                  <p className="text-[#f7eccf] text-lg font-medium">All tasks completed</p>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">Nice work! You're all caught up.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTasks.map(task => (
                    <motion.div 
                      key={task.id} 
                      variants={itemVariants}
                      className={`p-5 rounded-2xl bg-[#f7eccf]/5 transition-all ${
                        task.is_urgent ? 'border-l-4 border-red-500' : ''
                      }`}
                      whileHover={{ 
                        x: 5, 
                        y: -5,
                        backgroundColor: "rgba(247, 236, 207, 0.12)",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        transition: { duration: 0.2 }
                      }}
                    >
                      <div className="flex flex-col md:flex-row justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <h3 className="text-lg font-medium text-[#f7eccf]">{task.title}</h3>
                            {task.is_urgent && (
                              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-500">
                                URGENT
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-[#f7eccf]/70">
                            <div className="flex items-center">
                              <Users size={14} className="mr-2 text-[#f7eccf]/50" />
                              {task.assigned_to_name ? `Assigned to: ${task.assigned_to_name}` : 'Unassigned'}
                            </div>
                            {task.due_date && (
                              <div className="flex items-center">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-start">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            task.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {task.status === 'pending' ? 'Pending' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      
      case 'complaints':
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden"
            whileHover={{ 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              y: -5,
              transition: { duration: 0.3 }
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#f7eccf] flex items-center">
                  <AlertCircle size={20} className="mr-2 text-red-500" />
                  Complaints
                </h2>
                <Link href="/complaints">
                  <motion.button
                    className="py-2 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center gap-1 shadow-md"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    Go to Complaints <ChevronRight size={16} />
                  </motion.button>
                </Link>
              </div>
              
              {recentComplaints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[#f7eccf]/5 rounded-2xl">
                  <CheckCircle size={40} className="text-green-500 mb-3" />
                  <p className="text-[#f7eccf] text-lg font-medium">No active complaints</p>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">All customer issues have been resolved.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentComplaints.map(complaint => (
                    <motion.div 
                      key={complaint.id} 
                      variants={itemVariants}
                      className={`p-5 rounded-2xl bg-[#f7eccf]/5 transition-all ${
                        complaint.severity === 'high' ? 'border-l-4 border-red-500' : ''
                      }`}
                      whileHover={{ 
                        x: 5, 
                        y: -5,
                        backgroundColor: "rgba(247, 236, 207, 0.12)",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        transition: { duration: 0.2 }
                      }}
                    >
                      <div className="flex flex-col md:flex-row justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <h3 className="text-lg font-medium text-[#f7eccf]">{complaint.customer_name}</h3>
                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                              complaint.severity === 'high' ? 'bg-red-500/20 text-red-500' :
                              complaint.severity === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                              'bg-blue-500/20 text-blue-500'
                            }`}>
                              {complaint.severity.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-[#f7eccf]/70">
                            <div className="flex items-center">
                              <span className="capitalize">
                                {complaint.complaint_type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                              {new Date(complaint.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-start">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            complaint.status === 'open' ? 'bg-red-500/20 text-red-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {complaint.status === 'open' ? 'Open' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      
      case 'preorders':
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-[#1C1C1C] rounded-3xl shadow-xl overflow-hidden"
            whileHover={{ 
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              y: -5,
              transition: { duration: 0.3 }
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#f7eccf] flex items-center">
                  <Package size={20} className="mr-2 text-blue-500" />
                  Pre-Orders
                </h2>
                <Link href="/preorders">
                  <motion.button
                    className="py-2 px-4 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium flex items-center gap-1 shadow-md"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    Go to Pre-Orders <ChevronRight size={16} />
                  </motion.button>
                </Link>
              </div>
              
              {recentPreOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[#f7eccf]/5 rounded-2xl">
                  <CheckCircle size={40} className="text-green-500 mb-3" />
                  <p className="text-[#f7eccf] text-lg font-medium">No pending pre-orders</p>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">All orders have been processed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPreOrders.map(preorder => (
                    <motion.div 
                      key={preorder.id} 
                      variants={itemVariants}
                      className="p-5 rounded-2xl bg-[#f7eccf]/5 transition-all"
                      whileHover={{ 
                        x: 5, 
                        y: -5,
                        backgroundColor: "rgba(247, 236, 207, 0.12)",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        transition: { duration: 0.2 }
                      }}
                    >
                      <div className="flex flex-col md:flex-row justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <h3 className="text-lg font-medium text-[#f7eccf]">{preorder.customer_name}</h3>
                            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-[#f7eccf]/20 text-[#f7eccf]">
                              {preorder.order_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-[#f7eccf]/70">
                            {preorder.pickup_date ? (
                              <div className="flex items-center">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                Pickup: {new Date(preorder.pickup_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                No pickup date set
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-start">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            preorder.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {preorder.status === 'pending' ? 'Pending' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Background image */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#f7eccf]/40">
        <Image 
          src="/forest-hill-grocery.png" 
          alt="Summerhill Market" 
          fill 
          className="object-cover object-center opacity-10"
          priority
        />
        {/* Additional overlay for better readability */}
        <div className="absolute inset-0 bg-[#f7eccf]/5 backdrop-blur-[2px]"></div>
      </div>

      <motion.div 
        className="mb-6 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1C1C]">
              {isManager ? 
                `${department?.name || 'Department'} Dashboard` : 
                'My Dashboard'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {formatDate()}
            </p>
          </div>
          
          <motion.div 
            className="hidden md:flex items-center gap-2 p-2 rounded-xl bg-[#1C1C1C]/10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: "rgba(28, 28, 28, 0.15)",
              transition: { duration: 0.2 }
            }}
          >
            <div className="p-1.5 rounded-lg bg-[#1C1C1C]">
              <BarChart3 size={16} className="text-[#f7eccf]" />
            </div>
            <span className="text-sm font-medium text-[#1C1C1C]">
              {isManager ? 
                `Managing ${department?.name || 'Department'}` : 
                'Activity Overview'}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {error && (
        <motion.div 
          className="bg-red-100 text-red-800 p-4 rounded-2xl flex items-center mb-6 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <motion.div 
        className="bg-[#1C1C1C] p-1.5 rounded-2xl flex mb-6 shadow-xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
      >
        {['overview', 'tasks', 'complaints', 'preorders'].map((tab) => (
          <motion.button
            key={tab}
            className={`relative py-2.5 px-4 rounded-xl text-sm font-medium flex-1 transition-colors ${
              activeTab === tab ? 'text-[#1C1C1C] bg-[#f7eccf]' : 'text-[#f7eccf]/70 hover:text-[#f7eccf]'
            }`}
            onClick={() => setActiveTab(tab)}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            {activeTab === tab && (
              <motion.div
                className="absolute inset-0 bg-[#f7eccf] rounded-xl shadow-md -z-10"
                layoutId="tabBackground"
                transition={tabTransition}
              />
            )}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </motion.button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}