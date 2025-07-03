// src/services/tasks.ts
import api from './api'
import { User } from '@/contexts/AuthContext'
import DepartmentFilter from './department-filter'

export interface Task {
  id: number
  title: string
  description?: string
  department_id?: number
  assigned_by?: number
  assigned_to?: number
  assigned_to_department?: number
  is_urgent: boolean
  due_date?: string
  status: string
  created_at: string
  completed_at?: string
}

export interface TaskCreate {
  title: string
  description?: string
  department_id?: number
  assigned_by?: number
  assigned_to?: number
  assigned_to_department?: number
  is_urgent?: boolean
  due_date?: string
  status?: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  assigned_to?: number
  is_urgent?: boolean
  due_date?: string
  status?: string
}

export interface TasksParams {
  skip?: number
  limit?: number
  department_id?: number
  assigned_to?: number
  status?: string
  is_urgent?: boolean
  sort?: string
  order?: string
  search?: string
  [key: string]: any
}

/**
 * Get tasks with optional filters
 * Uses department filtering based on user role
 */
export const getTasks = async (params: TasksParams = {}, user: User | null = null) => {
  // Apply department filtering based on user role
  const filteredParams = DepartmentFilter.applyFilter(params, user);
  
  // Make API request with filtered params
  const response = await api.get('/tasks', { params: filteredParams })
  return response.data
}

/**
 * Get a single task by ID
 */
export const getTask = async (id: number) => {
  const response = await api.get(`/tasks/${id}`)
  return response.data
}

/**
 * Create a new task
 * Automatically sets department_id for non-admin users
 */
export const createTask = async (taskData: TaskCreate, user: User | null = null) => {
  // For new tasks, set the department automatically for non-admin users
  if (user?.department_id && user.role !== 'admin' && !taskData.department_id) {
    taskData = {
      ...taskData,
      department_id: user.department_id
    }
  }
  
  const response = await api.post('/tasks', taskData)
  return response.data
}

/**
 * Update an existing task
 * Checks if user has permission to update this task
 */
export const updateTask = async (id: number, taskData: TaskUpdate, user: User | null = null) => {
  // First, get the current task to check permissions
  if (user && user.role !== 'admin') {
    const currentTask = await getTask(id);
    
    // Check if user has permission to edit this task
    const canEdit = 
      // Admins can edit any task
      user.role === 'admin' ||
      // Managers can edit tasks in their department
      (user.role === 'manager' && currentTask.department_id === user.department_id) ||
      // Leads can edit tasks in their department
      (user.role === 'lead' && currentTask.department_id === user.department_id) ||
      // Any user can edit tasks assigned to them
      currentTask.assigned_to === user.id;
      
    if (!canEdit) {
      throw new Error('You do not have permission to edit this task');
    }
  }
  
  const response = await api.put(`/tasks/${id}`, taskData)
  return response.data
}

/**
 * Update just the status of a task
 */
export const updateTaskStatus = async (id: number, status: string, user: User | null = null) => {
  // First, check permissions similar to updateTask
  if (user && user.role !== 'admin') {
    const currentTask = await getTask(id);
    
    const canUpdateStatus = 
      user.role === 'admin' ||
      (user.role === 'manager' && currentTask.department_id === user.department_id) ||
      (user.role === 'lead' && currentTask.department_id === user.department_id) ||
      currentTask.assigned_to === user.id;
      
    if (!canUpdateStatus) {
      throw new Error('You do not have permission to update this task status');
    }
  }
  
  const response = await api.patch(`/tasks/${id}/status`, { status })
  return response.data
}

/**
 * Delete a task
 * Only admins and managers can delete tasks
 */
export const deleteTask = async (id: number, user: User | null = null) => {
  // First, check permissions
  if (user && user.role !== 'admin') {
    const currentTask = await getTask(id);
    
    const canDelete = 
      user.role === 'admin' ||
      (user.role === 'manager' && currentTask.department_id === user.department_id);
      
    if (!canDelete) {
      throw new Error('You do not have permission to delete this task');
    }
  }
  
  const response = await api.delete(`/tasks/${id}`)
  return response.data
}