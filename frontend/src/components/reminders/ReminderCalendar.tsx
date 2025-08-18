// src/components/reminders/ReminderCalendar.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reminder } from '@/services/reminders'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday
} from 'date-fns'

interface ReminderCalendarProps {
  reminders: Reminder[]
  onDateClick: (date: Date) => void
  selectedDate: Date
}

const ReminderCalendar: React.FC<ReminderCalendarProps> = ({
  reminders,
  onDateClick,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    })
  }, [currentMonth])
  
  // Get reminders for a specific date
  const getRemindersForDate = (date: Date) => {
    return reminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminder_date)
      return isSameDay(reminderDate, date)
    })
  }
  
  // Navigation functions
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }
  
  const resetToday = () => {
    setCurrentMonth(new Date())
  }
  
  return (
    <div className="bg-[#1C1C1C] rounded-3xl shadow-xl p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
            <CalendarIcon className="h-6 w-6 text-[#f7eccf]" />
          </div>
          <h2 className="text-xl font-bold text-[#f7eccf]">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevMonth}
            className="p-2 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={resetToday}
            className="px-3 py-1 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all text-sm"
          >
            Today
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextMonth}
            className="p-2 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div 
            key={day} 
            className="text-center py-2 text-[#f7eccf]/70 text-sm font-medium"
          >
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day:any, i:any) => {
          const dayReminders = getRemindersForDate(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentDay = isToday(day)
          
          return (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateClick(day)}
              className={cn(
                'min-h-12 p-1 rounded-xl flex flex-col items-center justify-start cursor-pointer border transition-all duration-200',
                isCurrentMonth ? 'text-[#f7eccf]' : 'text-[#f7eccf]/30',
                isSelected ? 'bg-[#f7eccf] text-[#1C1C1C] border-[#f7eccf]' : 
                  isCurrentDay ? 'bg-[#f7eccf]/10 border-[#f7eccf]/30' : 'border-transparent hover:bg-[#f7eccf]/5',
              )}
            >
              <span className={cn(
                'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                isSelected ? 'bg-[#1C1C1C] text-[#f7eccf]' : 
                  isCurrentDay && !isSelected ? 'bg-[#f7eccf]/20' : ''
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Reminder indicators */}
              {dayReminders.length > 0 && (
                <div className="flex flex-wrap justify-center mt-1 gap-0.5">
                  {dayReminders.length <= 3 ? (
                    dayReminders.map((reminder, index) => (
                      <div
                        key={reminder.id}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          reminder.priority === 'high' ? 'bg-red-500' :
                          reminder.priority === 'medium' ? 'bg-amber-500' :
                          'bg-green-500',
                          isSelected ? 'opacity-70' : 'opacity-100'
                        )}
                        title={reminder.title}
                      ></div>
                    ))
                  ) : (
                    <div className={cn(
                      'text-xs font-medium',
                      isSelected ? 'text-[#1C1C1C]' : 'text-[#f7eccf]/70'
                    )}>
                      {dayReminders.length}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default ReminderCalendar