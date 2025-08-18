// src/contexts/ReminderContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Reminder, getReminders, createReminder, updateReminder, completeReminder, deleteReminder } from '@/services/reminders'
import { useAuth } from '@/hooks/useAuth'
import { showNotification, scheduleNotification, cancelScheduledNotification } from '@/services/notifications'

interface ReminderContextType {
  reminders: Reminder[]
  loading: boolean
  error: string | null
  refreshReminders: () => Promise<void>
  addReminder: (reminderData: any) => Promise<Reminder | null>
  updateReminder: (id: number, reminderData: any) => Promise<Reminder | null>
  markAsCompleted: (id: number) => Promise<Reminder | null>
  removeReminder: (id: number) => Promise<boolean>
  requestNotificationPermission: () => Promise<boolean>
  notificationsEnabled: boolean
}

export const ReminderContext = createContext<ReminderContextType>({
  reminders: [],
  loading: false,
  error: null,
  refreshReminders: async () => {},
  addReminder: async () => null,
  updateReminder: async () => null,
  markAsCompleted: async () => null,
  removeReminder: async () => false,
  requestNotificationPermission: async () => false,
  notificationsEnabled: false,
})

interface ReminderProviderProps {
  children: React.ReactNode
}

export const ReminderProvider: React.FC<ReminderProviderProps> = ({ children }) => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false)
  const [scheduledNotifications, setScheduledNotifications] = useState<Map<number, number>>(new Map())
  
  const { user } = useAuth()

  // Check notification permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted')
      }
    }
    
    checkPermission()
  }, [])

  // Request notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }
    
    try {
      const permission = await Notification.requestPermission()
      const granted = permission === 'granted'
      setNotificationsEnabled(granted)
      return granted
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  // Fetch reminders from the API
  const fetchReminders = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await getReminders()
      
      if (response && response.items) {
        setReminders(response.items)
        
        // Clear existing scheduled notifications
        scheduledNotifications.forEach((timeoutId) => {
          cancelScheduledNotification(timeoutId)
        })
        
        // Schedule new notifications for upcoming reminders
        const newScheduled = new Map<number, number>()
        
        response.items.forEach((reminder: Reminder) => {
          if (!reminder.is_completed) {
            const reminderDate = new Date(reminder.reminder_date)
            
            // Only schedule if it's in the future
            if (reminderDate > new Date()) {
              const timeoutId = scheduleNotification(
                reminder.title,
                reminderDate,
                {
                  body: reminder.description || 'You have a reminder!',
                  tag: `reminder-${reminder.id}`
                }
              )
              
              if (timeoutId !== -1) {
                newScheduled.set(reminder.id, timeoutId)
              }
            }
          }
        })
        
        setScheduledNotifications(newScheduled)
      }
    } catch (err: any) {
      console.error('Error fetching reminders:', err)
      setError(err.response?.data?.detail || 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }, [user, scheduledNotifications])

  // Fetch reminders on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchReminders()
    } else {
      setReminders([])
    }
    
    return () => {
      // Clean up scheduled notifications on unmount
      scheduledNotifications.forEach((timeoutId) => {
        cancelScheduledNotification(timeoutId)
      })
    }
  }, [user])

  // Add a new reminder
  const addReminder = async (reminderData: any): Promise<Reminder | null> => {
    try {
      setError(null)
      const newReminder = await createReminder(reminderData)
      
      if (newReminder) {
        setReminders(prev => [...prev, newReminder])
        
        // Schedule notification if not completed and in the future
        if (!newReminder.is_completed) {
          const reminderDate = new Date(newReminder.reminder_date)
          
          if (reminderDate > new Date() && notificationsEnabled) {
            const timeoutId = scheduleNotification(
              newReminder.title,
              reminderDate,
              {
                body: newReminder.description || 'You have a reminder!',
                tag: `reminder-${newReminder.id}`
              }
            )
            
            if (timeoutId !== -1) {
              setScheduledNotifications(prev => {
                const newMap = new Map(prev)
                newMap.set(newReminder.id, timeoutId)
                return newMap
              })
            }
          }
        }
        
        return newReminder
      }
      
      return null
    } catch (err: any) {
      console.error('Error adding reminder:', err)
      setError(err.response?.data?.detail || 'Failed to add reminder')
      return null
    }
  }

  // Update an existing reminder
  const updateReminderItem = async (id: number, reminderData: any): Promise<Reminder | null> => {
    try {
      setError(null)
      const updatedReminder = await updateReminder(id, reminderData)
      
      if (updatedReminder) {
        setReminders(prev => 
          prev.map(reminder => 
            reminder.id === id ? updatedReminder : reminder
          )
        )
        
        // Cancel existing scheduled notification
        if (scheduledNotifications.has(id)) {
          cancelScheduledNotification(scheduledNotifications.get(id)!)
          
          setScheduledNotifications(prev => {
            const newMap = new Map(prev)
            newMap.delete(id)
            return newMap
          })
        }
        
        // Schedule new notification if not completed and in the future
        if (!updatedReminder.is_completed) {
          const reminderDate = new Date(updatedReminder.reminder_date)
          
          if (reminderDate > new Date() && notificationsEnabled) {
            const timeoutId = scheduleNotification(
              updatedReminder.title,
              reminderDate,
              {
                body: updatedReminder.description || 'You have a reminder!',
                tag: `reminder-${updatedReminder.id}`
              }
            )
            
            if (timeoutId !== -1) {
              setScheduledNotifications(prev => {
                const newMap = new Map(prev)
                newMap.set(updatedReminder.id, timeoutId)
                return newMap
              })
            }
          }
        }
        
        return updatedReminder
      }
      
      return null
    } catch (err: any) {
      console.error('Error updating reminder:', err)
      setError(err.response?.data?.detail || 'Failed to update reminder')
      return null
    }
  }

  // Mark a reminder as completed
  const markAsCompleted = async (id: number): Promise<Reminder | null> => {
    try {
      setError(null)
      const completedReminder = await completeReminder(id)
      
      if (completedReminder) {
        setReminders(prev => 
          prev.map(reminder => 
            reminder.id === id ? completedReminder : reminder
          )
        )
        
        // Cancel scheduled notification if exists
        if (scheduledNotifications.has(id)) {
          cancelScheduledNotification(scheduledNotifications.get(id)!)
          
          setScheduledNotifications(prev => {
            const newMap = new Map(prev)
            newMap.delete(id)
            return newMap
          })
        }
        
        return completedReminder
      }
      
      return null
    } catch (err: any) {
      console.error('Error completing reminder:', err)
      setError(err.response?.data?.detail || 'Failed to complete reminder')
      return null
    }
  }

  // Remove a reminder
  const removeReminder = async (id: number): Promise<boolean> => {
    try {
      setError(null)
      await deleteReminder(id)
      
      setReminders(prev => prev.filter(reminder => reminder.id !== id))
      
      // Cancel scheduled notification if exists
      if (scheduledNotifications.has(id)) {
        cancelScheduledNotification(scheduledNotifications.get(id)!)
        
        setScheduledNotifications(prev => {
          const newMap = new Map(prev)
          newMap.delete(id)
          return newMap
        })
      }
      
      return true
    } catch (err: any) {
      console.error('Error deleting reminder:', err)
      setError(err.response?.data?.detail || 'Failed to delete reminder')
      return false
    }
  }

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        loading,
        error,
        refreshReminders: fetchReminders,
        addReminder,
        updateReminder: updateReminderItem,
        markAsCompleted,
        removeReminder,
        requestNotificationPermission,
        notificationsEnabled,
      }}
    >
      {children}
    </ReminderContext.Provider>
  )
}

export const useReminders = () => useContext(ReminderContext)

export default useReminders