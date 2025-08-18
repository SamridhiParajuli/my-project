// src/services/reminders.ts
import api from './api'

export interface Reminder {
  id: number
  user_id: number
  title: string
  description?: string
  reminder_date: string
  priority: 'low' | 'medium' | 'high'
  is_completed: boolean
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly'
  created_at: string
  updated_at?: string
}

export interface ReminderCreate {
  title: string
  description?: string
  reminder_date: string
  priority?: 'low' | 'medium' | 'high'
  is_completed?: boolean
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly'
}

export interface ReminderUpdate {
  title?: string
  description?: string
  reminder_date?: string
  priority?: 'low' | 'medium' | 'high'
  is_completed?: boolean
  repeat_type?: 'none' | 'daily' | 'weekly' | 'monthly'
}

export interface RemindersParams {
  skip?: number
  limit?: number
  completed?: boolean
  priority?: string
  sort?: string
  order?: string
  search?: string
}

/**
 * Get all reminders with optional filters
 */
export const getReminders = async (params: RemindersParams = {}) => {
  const response = await api.get('/reminders', { params })
  return response.data
}

/**
 * Get upcoming reminders for the next X days
 */
export const getUpcomingReminders = async (days: number = 7) => {
  const response = await api.get(`/reminders/upcoming`, { params: { days } })
  return response.data
}

/**
 * Get today's reminders
 */
export const getTodayReminders = async () => {
  const response = await api.get('/reminders/today')
  return response.data
}

/**
 * Get a single reminder by ID
 */
export const getReminder = async (id: number) => {
  const response = await api.get(`/reminders/${id}`)
  return response.data
}

/**
 * Create a new reminder
 */
export const createReminder = async (reminderData: ReminderCreate) => {
  const response = await api.post('/reminders', reminderData)
  return response.data
}

/**
 * Update an existing reminder
 */
export const updateReminder = async (id: number, reminderData: ReminderUpdate) => {
  const response = await api.put(`/reminders/${id}`, reminderData)
  return response.data
}

/**
 * Mark a reminder as completed
 */
export const completeReminder = async (id: number) => {
  const response = await api.patch(`/reminders/${id}/complete`, {})
  return response.data
}

/**
 * Delete a reminder
 */
export const deleteReminder = async (id: number) => {
  const response = await api.delete(`/reminders/${id}`)
  return response.data
}

export default {
  getReminders,
  getUpcomingReminders,
  getTodayReminders,
  getReminder,
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder,
}