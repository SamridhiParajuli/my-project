// app/(dashboard)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import Link from 'next/link'

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-500">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-amber-700">Tasks</h3>
                      <p className="text-2xl font-bold text-amber-900">{counts.tasks.total}</p>
                    </div>
                    <div className="p-2 bg-amber-200 bg-opacity-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-amber-700 grid grid-cols-3 gap-2">
                    <div>
                      <span className="block font-medium">Pending</span>
                      <span className="text-amber-900 font-bold">{counts.tasks.pending}</span>
                    </div>
                    <div>
                      <span className="block font-medium">In Progress</span>
                      <span className="text-amber-900 font-bold">{counts.tasks.in_progress}</span>
                    </div>
                    <div>
                      <span className="block font-medium">Urgent</span>
                      <span className="text-amber-900 font-bold">{counts.tasks.urgent}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button 
                      onClick={() => setActiveTab('tasks')}
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                    >
                      View Tasks
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-red-700">Complaints</h3>
                      <p className="text-2xl font-bold text-red-900">{counts.complaints.total}</p>
                    </div>
                    <div className="p-2 bg-red-200 bg-opacity-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-red-700 grid grid-cols-3 gap-2">
                    <div>
                      <span className="block font-medium">Open</span>
                      <span className="text-red-900 font-bold">{counts.complaints.open}</span>
                    </div>
                    <div>
                      <span className="block font-medium">In Progress</span>
                      <span className="text-red-900 font-bold">{counts.complaints.in_progress}</span>
                    </div>
                    <div>
                      <span className="block font-medium">Resolved</span>
                      <span className="text-red-900 font-bold">{counts.complaints.resolved}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button 
                      onClick={() => setActiveTab('complaints')}
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 text-white w-full"
                    >
                      View Complaints
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-blue-700">Pre-Orders</h3>
                      <p className="text-2xl font-bold text-blue-900">{counts.preorders.total}</p>
                    </div>
                    <div className="p-2 bg-blue-200 bg-opacity-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-700 grid grid-cols-3 gap-2">
                    <div>
                      <span className="block font-medium">Pending</span>
                      <span className="text-blue-900 font-bold">{counts.preorders.pending}</span>
                    </div>
                    <div>
                      <span className="block font-medium">In Progress</span>
                      <span className="text-blue-900 font-bold">{counts.preorders.in_progress}</span>
                    </div>
                    <div>
                      <span className="block font-medium">Completed</span>
                      <span className="text-blue-900 font-bold">{counts.preorders.completed}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button 
                      onClick={() => setActiveTab('preorders')}
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    >
                      View Pre-Orders
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-green-700">Announcements</h3>
                      <p className="text-2xl font-bold text-green-900">{counts.announcements.total}</p>
                    </div>
                    <div className="p-2 bg-green-200 bg-opacity-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-green-700">
                    <div>
                      <span className="block font-medium">Unread</span>
                      <span className="text-green-900 font-bold">{counts.announcements.unread}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link href="/announcements">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
                        View Announcements
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Recent activity preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Quick preview - Recent Tasks */}
              <Card className="lg:col-span-1">
                <CardBody className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-primary">Recent Tasks</h2>
                    <Button 
                      onClick={() => setActiveTab('tasks')}
                      size="sm" 
                      variant="ghost" 
                      className="text-primary"
                    >
                      View All
                    </Button>
                  </div>
                  
                  {recentTasks.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No pending tasks.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="py-2">
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-primary flex items-center">
                                {task.title}
                                {task.is_urgent && (
                                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                                    URGENT
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {task.status === 'pending' ? 'Pending' : 'In Progress'}
                                {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Quick preview - Recent Complaints */}
              <Card className="lg:col-span-1">
                <CardBody className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-primary">Recent Complaints</h2>
                    <Button 
                      onClick={() => setActiveTab('complaints')}
                      size="sm" 
                      variant="ghost" 
                      className="text-primary"
                    >
                      View All
                    </Button>
                  </div>
                  
                  {recentComplaints.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No active complaints.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentComplaints.slice(0, 3).map(complaint => (
                        <div key={complaint.id} className="py-2">
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-primary flex items-center">
                                {complaint.customer_name}
                                {complaint.severity === 'high' && (
                                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                                    HIGH
                                  </span>
                                )}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {complaint.status === 'open' ? 'Open' : 'In Progress'}
                                {` • ${complaint.complaint_type.replace('_', ' ')}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Quick preview - Recent Pre-Orders */}
              <Card className="lg:col-span-1">
                <CardBody className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-primary">Recent Pre-Orders</h2>
                    <Button 
                      onClick={() => setActiveTab('preorders')}
                      size="sm" 
                      variant="ghost" 
                      className="text-primary"
                    >
                      View All
                    </Button>
                  </div>
                  
                  {recentPreOrders.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No active pre-orders.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentPreOrders.slice(0, 3).map(preorder => (
                        <div key={preorder.id} className="py-2">
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-primary">
                                {preorder.customer_name}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {preorder.status === 'pending' ? 'Pending' : 'In Progress'}
                                {` • ${preorder.order_type.replace('_', ' ')}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </>
        );
      
      case 'tasks':
        return (
          <Card>
            <CardBody>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-primary">Tasks</h2>
                <Link href="/tasks">
                  <Button className="bg-primary text-white">
                    Go to Tasks Page
                  </Button>
                </Link>
              </div>
              
              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tasks found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {recentTasks.map(task => (
                    <Card key={task.id} className={`${task.is_urgent ? 'border-l-4 border-accent-red' : 'border'}`}>
                      <CardBody>
                        <div className="flex flex-col md:flex-row justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-medium text-primary">{task.title}</h3>
                              {task.is_urgent && (
                                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-accent-red text-white">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {task.assigned_to_name ? `Assigned to: ${task.assigned_to_name}` : 'Unassigned'}
                              {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {task.status === 'pending' ? 'Pending' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        );
      
      case 'complaints':
        return (
          <Card>
            <CardBody>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-primary">Complaints</h2>
                <Link href="/complaints">
                  <Button className="bg-primary text-white">
                    Go to Complaints Page
                  </Button>
                </Link>
              </div>
              
              {recentComplaints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No complaints found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {recentComplaints.map(complaint => (
                    <Card key={complaint.id} className={`${complaint.severity === 'high' ? 'border-l-4 border-accent-red' : 'border'}`}>
                      <CardBody>
                        <div className="flex flex-col md:flex-row justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-medium text-primary">{complaint.customer_name}</h3>
                              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                complaint.severity === 'high' ? 'bg-accent-red text-white' :
                                complaint.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {complaint.severity.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {complaint.complaint_type.replace('_', ' ')}
                              {` • Created: ${new Date(complaint.created_at).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              complaint.status === 'open' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {complaint.status === 'open' ? 'Open' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        );
      
      case 'preorders':
        return (
          <Card>
            <CardBody>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-primary">Pre-Orders</h2>
                <Link href="/preorders">
                  <Button className="bg-primary text-white">
                    Go to Pre-Orders Page
                  </Button>
                </Link>
              </div>
              
              {recentPreOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No pre-orders found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {recentPreOrders.map(preorder => (
                    <Card key={preorder.id}>
                      <CardBody>
                        <div className="flex flex-col md:flex-row justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-medium text-primary">{preorder.customer_name}</h3>
                              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-black text-white">
                                {preorder.order_type.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {preorder.pickup_date ? `Pickup: ${new Date(preorder.pickup_date).toLocaleDateString()}` : 'No pickup date set'}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              preorder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {preorder.status === 'pending' ? 'Pending' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">
          {isManager ? 
            `${department?.name || 'Department'} Dashboard` : 
            'My Dashboard'}
        </h1>
        <p className="text-primary-light">
          {isManager ? 
            `Overview of all ${department?.name || 'department'} activities` : 
            'Overview of your assigned tasks and activities'}
        </p>
      </div>

      {error && (
        <div className="bg-accent-red/10 text-accent-red p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'overview'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-primary'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'tasks'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-primary'
          }`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'complaints'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-primary'
          }`}
          onClick={() => setActiveTab('complaints')}
        >
          Complaints
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'preorders'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-primary'
          }`}
          onClick={() => setActiveTab('preorders')}
        >
          Pre-Orders
        </button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}