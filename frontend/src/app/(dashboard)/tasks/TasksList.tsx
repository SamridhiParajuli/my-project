// app/(dashboard)/tasks/TasksList.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import Button from '@/components/ui/Button'
import { Task } from '@/types'

interface TasksListProps {
  fallbackData?: Task[];
  activeTab?: string;
  onTaskUpdated?: () => void;
}

export default function TasksList({ 
  fallbackData = [], 
  activeTab = 'all', 
  onTaskUpdated 
}: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>(fallbackData)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { user, isAdmin, isManager } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    const fetchTasks = async (): Promise<void> => {
      try {
        setLoading(true)
        
        // Prepare filters
        const params: Record<string, any> = {}
        if (activeTab !== 'all') {
          params.status = activeTab
        }
        
        // Add department filter for non-admin users
        if (user && user.role !== 'admin' && user.department_id) {
          params.department_id = user.department_id
        }
        
        const response = await api.get('/tasks', { params })
        
        if (response.data && response.data.items) {
          setTasks(response.data.items)
        } else {
          setTasks(fallbackData)
        }
      } catch (err) {
        console.error('Error fetching tasks:', err)
        setError('Failed to load tasks')
        setTasks(fallbackData)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTasks()
  }, [user, fallbackData, activeTab])
  
  // Handle task status update
  const handleStatusChange = async (taskId: number, newStatus: string): Promise<void> => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      
      // Update local state
      setTasks(currentTasks => 
        currentTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
      
      // Notify parent component if provided
      if (onTaskUpdated) {
        onTaskUpdated()
      }
    } catch (err) {
      setError('Failed to update task status')
    }
  }
  
  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true
    return task.status === activeTab
  })
  
  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>
  }
  
  if (error) {
    return (
      <div className="bg-gold/10 text-gold p-4 mb-4 rounded-lg">
        {error}
      </div>
    )
  }
  
  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-8 text-dark-600">
        No tasks found for this category.
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {filteredTasks.map(task => (
        <div key={task.id} className="p-4 border border-cream-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-dark-800">{task.title}</h3>
              <p className="text-sm text-dark-600">
                Assigned to: {typeof task.assigned_to === 'number' ? `ID: ${task.assigned_to}` : 'Unassigned'}
              </p>
              {task.description && (
                <p className="text-sm text-dark-600 mt-1">{task.description}</p>
              )}
            </div>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              task.status === 'completed' 
                ? 'bg-accent-green/10 text-accent-green' 
                : task.status === 'in_progress'
                ? 'bg-gold/10 text-gold'
                : 'bg-accent-blue/10 text-accent-blue'
            }`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-dark-500">
              Due: {task.due_date || 'Not set'}
            </span>
            <div className="flex space-x-2">
              {(isAdmin || isManager || task.assigned_to === user?.id) && 
               task.status !== 'completed' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStatusChange(task.id, 
                    task.status === 'pending' ? 'in_progress' : 'completed'
                  )}
                >
                  {task.status === 'pending' ? 'Start' : 'Complete'}
                </Button>
              )}
              
              <Button 
                size="sm"
                variant="secondary"
                onClick={() => router.push(`/tasks/${task.id}`)}
              >
                Details
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}