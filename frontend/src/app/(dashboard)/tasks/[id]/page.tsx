// app/(dashboard)/tasks/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, Variants } from 'framer-motion'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { 
  Clipboard,
  Edit,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Building,
  Flag,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import TaskEditModal from '@/components/dashboard/TaskEditModal'

// Define animation variants
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

export default function TaskDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, isAdmin, isManager } = useAuth()
  const [task, setTask] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/tasks/${params.id}`)
        setTask(response.data)
      } catch (err: any) {
        console.error('Error fetching task details:', err)
        setError(err.response?.data?.detail || 'Failed to load task details')
      } finally {
        setLoading(false)
      }
    }

    fetchTaskDetails()
  }, [params.id])

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/tasks/${params.id}/status`, { status: newStatus })
      
      // Update local state
      setTask((prevTask:any) => 
        prevTask ? { ...prevTask, status: newStatus } : null
      )
    } catch (err: any) {
      console.error('Error updating task status:', err)
      setError(err.response?.data?.detail || 'Failed to update task status')
    }
  }

  const handleTaskUpdated = (updatedTask: any) => {
    setTask(updatedTask)
    setShowEditModal(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <motion.div 
          className="w-12 h-12 rounded-full border-2 border-[#f7eccf] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-red-500 flex items-center mb-4"
      >
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <p>{error}</p>
      </motion.div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-8 text-dark-600">
        Task not found.
      </div>
    )
  }

  const canEdit = isAdmin || isManager || task.assigned_by === user?.id
  const canUpdateStatus = canEdit || task.assigned_to === user?.id

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
                  <Clipboard className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Task Details</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    View and manage task information
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => router.back()}
                  className="bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </Button>
                
                {canEdit && (
                  <Button
                    onClick={() => setShowEditModal(true)}
                    className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                  >
                    <Edit size={18} />
                    <span>Edit Task</span>
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Task Details */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <h2 className="text-xl font-semibold text-[#f7eccf]">{task.title}</h2>
                  {task.is_urgent && (
                    <span className="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-500 flex items-center">
                      <Flag size={12} className="mr-1" />
                      URGENT
                    </span>
                  )}
                </div>
                
                <div className="p-4 bg-[#f7eccf]/5 rounded-xl mb-6">
                  <p className="text-[#f7eccf]/90 whitespace-pre-wrap">{task.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center">
                    <Building size={18} className="mr-3 text-[#f7eccf]/40" />
                    <div>
                      <span className="text-xs text-[#f7eccf]/60">Department</span>
                      <p className="text-[#f7eccf]">{task.department_name || 'No Department'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <User size={18} className="mr-3 text-[#f7eccf]/40" />
                    <div>
                      <span className="text-xs text-[#f7eccf]/60">Assigned By</span>
                      <p className="text-[#f7eccf]">{task.assigned_by_name || 'System'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <User size={18} className="mr-3 text-[#f7eccf]/40" />
                    <div>
                      <span className="text-xs text-[#f7eccf]/60">Assigned To</span>
                      <p className="text-[#f7eccf]">
                        {task.assigned_to_name || 'Unassigned'}
                        {!task.assigned_to_name && task.assigned_to_department_name && 
                          ` (Dept: ${task.assigned_to_department_name})`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {task.due_date ? (
                      <>
                        <Calendar size={18} className="mr-3 text-[#f7eccf]/40" />
                        <div>
                          <span className="text-xs text-[#f7eccf]/60">Due Date</span>
                          <p className="text-[#f7eccf]">{new Date(task.due_date).toLocaleDateString()}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Clock size={18} className="mr-3 text-[#f7eccf]/40" />
                        <div>
                          <span className="text-xs text-[#f7eccf]/60">Due Date</span>
                          <p className="text-[#f7eccf]">No due date</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <Clock size={18} className="mr-3 text-[#f7eccf]/40" />
                    <div>
                      <span className="text-xs text-[#f7eccf]/60">Created</span>
                      <p className="text-[#f7eccf]">{new Date(task.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {task.completed_at && (
                    <div className="flex items-center">
                      <CheckCircle size={18} className="mr-3 text-green-500" />
                      <div>
                        <span className="text-xs text-[#f7eccf]/60">Completed</span>
                        <p className="text-[#f7eccf]">{new Date(task.completed_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:w-64">
                <div className="bg-[#f7eccf]/5 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-[#f7eccf]/70 mb-2">Status</h3>
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    task.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                    task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-green-500/20 text-green-500'
                  }`}>
                    {task.status === 'pending' && <Clock size={14} className="mr-1" />}
                    {task.status === 'in_progress' && <ArrowRight size={14} className="mr-1" />}
                    {task.status === 'completed' && <CheckCircle size={14} className="mr-1" />}
                    {task.status === 'pending' ? 'Pending' :
                    task.status === 'in_progress' ? 'In Progress' :
                    'Completed'}
                  </div>
                </div>
                
                {canUpdateStatus && task.status !== 'completed' && (
                  <div className="space-y-2">
                    {task.status === 'pending' && (
                      <Button
                        onClick={() => handleStatusChange('in_progress')}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1"
                      >
                        <ArrowRight size={16} />
                        Start Task
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        onClick={() => handleStatusChange('completed')}
                        className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={16} />
                        Complete Task
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Edit Modal */}
      {showEditModal && task && (
        <TaskEditModal
          task={task}
          onClose={() => setShowEditModal(false)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </motion.div>
  )
}