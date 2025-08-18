// src/components/reminders/ReminderCard.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Bell, Calendar, CheckCircle, Clock, Edit, MoreVertical, Trash } from 'lucide-react'
import { Reminder } from '@/services/reminders'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'

interface ReminderCardProps {
  reminder: Reminder
  onComplete: (id: number) => void
  onEdit: (reminder: Reminder) => void
  onDelete: (id: number) => void
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onComplete,
  onEdit,
  onDelete,
}) => {
  const reminderDate = new Date(reminder.reminder_date)
  const isPastDue = isPast(reminderDate) && !reminder.is_completed
  const isTodays = isToday(reminderDate)
  
  // Get priority color
  const getPriorityColor = () => {
    switch (reminder.priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500'
      case 'medium':
        return 'bg-amber-500/10 text-amber-500'
      case 'low':
        return 'bg-green-500/10 text-green-500'
      default:
        return 'bg-blue-500/10 text-blue-500'
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-3xl shadow-lg overflow-hidden',
        reminder.is_completed ? 'bg-[#1C1C1C]/50 border border-[#f7eccf]/10' : 'bg-[#1C1C1C] border border-[#f7eccf]/20',
        isPastDue && !reminder.is_completed ? 'border-red-500/50' : ''
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={cn(
              'p-2 rounded-full mr-3',
              reminder.is_completed ? 'bg-green-500/10' : 'bg-[#f7eccf]/10'
            )}>
              {reminder.is_completed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Bell className="h-5 w-5 text-[#f7eccf]" />
              )}
            </div>
            <div>
              <h3 className={cn(
                'font-semibold text-lg',
                reminder.is_completed ? 'text-[#f7eccf]/50 line-through' : 'text-[#f7eccf]'
              )}>
                {reminder.title}
              </h3>
              <div className="flex items-center text-xs text-[#f7eccf]/70 mt-1">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  {isTodays ? 'Today' : formatDistanceToNow(reminderDate, { addSuffix: true })}
                  {isPastDue && ' (Overdue)'}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <span className={cn(
              'text-xs px-2 py-1 rounded-full font-medium',
              getPriorityColor()
            )}>
              {reminder.priority}
            </span>
          </div>
        </div>
        
        {reminder.description && (
          <p className={cn(
            'text-sm mb-4 line-clamp-2',
            reminder.is_completed ? 'text-[#f7eccf]/40' : 'text-[#f7eccf]/70'
          )}>
            {reminder.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center text-sm text-[#f7eccf]/60">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{format(reminderDate, 'MMM d, yyyy - h:mm a')}</span>
          </div>
          
          <div className="flex space-x-2">
            {!reminder.is_completed && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onComplete(reminder.id)}
                className="p-2 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all"
                title="Mark as completed"
              >
                <CheckCircle className="h-4 w-4" />
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(reminder)}
              className="p-2 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
              title="Edit reminder"
            >
              <Edit className="h-4 w-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(reminder.id)}
              className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
              title="Delete reminder"
            >
              <Trash className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ReminderCard