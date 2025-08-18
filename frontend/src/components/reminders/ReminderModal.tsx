// src/components/reminders/ReminderModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Calendar, Check, Clock, X } from 'lucide-react'
import { Reminder } from '@/services/reminders'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (reminderData: any) => void
  reminder?: Reminder | null
  title?: string
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  reminder = null,
  title = 'Create Reminder',
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '',
    priority: 'medium',
    repeat_type: 'none',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Initialize form with reminder data if editing
  useEffect(() => {
    if (reminder) {
      const reminderDate = new Date(reminder.reminder_date)
      setFormData({
        title: reminder.title,
        description: reminder.description || '',
        reminder_date: format(reminderDate, 'yyyy-MM-dd'),
        reminder_time: format(reminderDate, 'HH:mm'),
        priority: reminder.priority,
        repeat_type: reminder.repeat_type,
      })
    } else {
      // Set default date to today and time to current time + 1 hour
      const now = new Date()
      now.setHours(now.getHours() + 1)
      
      setFormData({
        title: '',
        description: '',
        reminder_date: format(now, 'yyyy-MM-dd'),
        reminder_time: format(now, 'HH:mm'),
        priority: 'medium',
        repeat_type: 'none',
      })
    }
  }, [reminder, isOpen])
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.reminder_date) {
      newErrors.reminder_date = 'Date is required'
    }
    
    if (!formData.reminder_time) {
      newErrors.reminder_time = 'Time is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = () => {
    if (validateForm()) {
      // Combine date and time for the reminder_date field
      const dateTimeString = `${formData.reminder_date}T${formData.reminder_time}:00`
      
      // Prepare data for API
      const reminderData = {
        title: formData.title,
        description: formData.description,
        reminder_date: dateTimeString,
        priority: formData.priority,
        repeat_type: formData.repeat_type,
      }
      
      onSave(reminderData)
      onClose()
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-[#1C1C1C] rounded-3xl w-full max-w-md p-6 shadow-xl z-10 m-4"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
                  <Bell className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <h2 className="text-xl font-bold text-[#f7eccf]">{title}</h2>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Title*
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={cn(
                    "w-full p-3 bg-[#f7eccf]/5 border rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all",
                    errors.title ? "border-red-500" : "border-[#f7eccf]/20"
                  )}
                  placeholder="Enter reminder title"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-500">{errors.title}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                  placeholder="Enter reminder details (optional)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reminder_date" className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                    Date*
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="reminder_date"
                      name="reminder_date"
                      value={formData.reminder_date}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full p-3 bg-[#f7eccf]/5 border rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all pr-10",
                        errors.reminder_date ? "border-red-500" : "border-[#f7eccf]/20"
                      )}
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#f7eccf]/50" />
                    {errors.reminder_date && (
                      <p className="mt-1 text-xs text-red-500">{errors.reminder_date}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="reminder_time" className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                    Time*
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      id="reminder_time"
                      name="reminder_time"
                      value={formData.reminder_time}
                      onChange={handleInputChange}
                      className={cn(
                        "w-full p-3 bg-[#f7eccf]/5 border rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all pr-10",
                        errors.reminder_time ? "border-red-500" : "border-[#f7eccf]/20"
                      )}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#f7eccf]/50" />
                    {errors.reminder_time && (
                      <p className="mt-1 text-xs text-red-500">{errors.reminder_time}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all appearance-none"
                >
                  <option value="low" className="bg-[#1C1C1C]">Low</option>
                  <option value="medium" className="bg-[#1C1C1C]">Medium</option>
                  <option value="high" className="bg-[#1C1C1C]">High</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="repeat_type" className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Repeat
                </label>
                <select
                  id="repeat_type"
                  name="repeat_type"
                  value={formData.repeat_type}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all appearance-none"
                >
                  <option value="none" className="bg-[#1C1C1C]">Don't repeat</option>
                  <option value="daily" className="bg-[#1C1C1C]">Daily</option>
                  <option value="weekly" className="bg-[#1C1C1C]">Weekly</option>
                  <option value="monthly" className="bg-[#1C1C1C]">Monthly</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={onClose}
                  className="bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 px-4 py-2 rounded-xl"
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  Save Reminder
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ReminderModal