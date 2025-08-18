// app/(dashboard)/reminders/page.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useReminders } from '@/contexts/ReminderContext'
import {
  Bell,
  Plus,
  CalendarClock,
  CheckCircle2,
  Clock,
  Bell as BellIcon,
  AlertCircle,
  MoreHorizontal,
  ListFilter,
} from 'lucide-react'
import { Reminder } from '@/services/reminders'
import ReminderCard from '@/components/reminders/ReminderCard'
import ReminderCalendar from '@/components/reminders/ReminderCalendar'
import ReminderModal from '@/components/reminders/ReminderModal'
import { format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

// Define animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const itemVariants:Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
}

export default function RemindersPage() {
  const {
    reminders,
    loading,
    error,
    refreshReminders,
    addReminder,
    updateReminder,
    markAsCompleted,
    removeReminder,
    requestNotificationPermission,
    notificationsEnabled
  } = useReminders()
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(!notificationsEnabled)
  
  // Request notification permission when page loads if not already granted
  useEffect(() => {
    setShowNotificationBanner(!notificationsEnabled)
  }, [notificationsEnabled])
  
  // Handle notification permission request
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setShowNotificationBanner(!granted)
  }
  
  // Filter reminders based on selected date and active filter
  const filteredReminders = useMemo(() => {
    return reminders
      .filter(reminder => {
        const reminderDate = new Date(reminder.reminder_date)
        
        // Filter by selected date if not in 'all' view
        if (activeFilter !== 'all') {
          const isSameSelectedDay = isSameDay(reminderDate, selectedDate)
          if (!isSameSelectedDay) return false
        }
        
        // Apply additional filters
        switch (activeFilter) {
          case 'completed':
            return reminder.is_completed
          case 'pending':
            return !reminder.is_completed
          default:
            return true
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.reminder_date)
        const dateB = new Date(b.reminder_date)
        return dateA.getTime() - dateB.getTime()
      })
  }, [reminders, selectedDate, activeFilter])
  
  // Handle date selection from calendar
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setActiveFilter('date')
  }
  
  // Handle opening modal for creating a new reminder
  const handleAddReminder = () => {
    setEditingReminder(null)
    setShowModal(true)
  }
  
  // Handle opening modal for editing an existing reminder
  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setShowModal(true)
  }
  
// Handle saving a reminder (create or update)
  const handleSaveReminder = async (reminderData: any) => {
    let success;
    if (editingReminder) {
      // Just update without refreshing
      await updateReminder(editingReminder.id, reminderData);
    } else {
      // Just add without refreshing
      await addReminder(reminderData);
    }
    // No need to call refreshReminders here, as the context already updates the state
  }
  
  // Handle marking a reminder as completed
  const handleCompleteReminder = async (id: number) => {
    await markAsCompleted(id);
    // No need to call refreshReminders here, as the context already updates the state
  }
  
  // Handle deleting a reminder
  const handleDeleteReminder = async (id: number) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      await removeReminder(id);
      // No need to call refreshReminders here, as the context already updates the state
    }
  }
  
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
                  <Bell className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Reminders</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Set reminders for important tasks and events
                  </p>
                </div>
              </div>
              
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  onClick={handleAddReminder}
                  className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                >
                  <Plus size={18} />
                  <span>Add Reminder</span>
                </Button>
              </motion.div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Notification Permission Banner */}
      <AnimatePresence>
        {showNotificationBanner && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#f7eccf]/10 border border-[#f7eccf]/30 rounded-3xl p-4 shadow-lg"
          >
            <div className="flex items-start md:items-center flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center">
                <div className="p-2 bg-[#f7eccf]/20 rounded-full mr-3">
                  <BellIcon className="h-5 w-5 text-[#f7eccf]" />
                </div>
                <div>
                  <h3 className="text-[#f7eccf] font-medium">Enable Notifications</h3>
                  <p className="text-[#f7eccf]/70 text-sm">Allow notifications to receive reminders even when you're not on this page</p>
                </div>
              </div>
              
              <div className="flex gap-2 md:ml-4 w-full md:w-auto">
                <Button
                  onClick={() => setShowNotificationBanner(false)}
                  className="bg-transparent border border-[#f7eccf]/30 text-[#f7eccf]/70 hover:bg-[#f7eccf]/5 rounded-xl px-4 flex-1 md:flex-none"
                >
                  Dismiss
                </Button>
                
                <Button
                  onClick={handleEnableNotifications}
                  className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-xl px-4 flex-1 md:flex-none"
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      {error && (
        <motion.div 
          variants={itemVariants}
          className="bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-red-500 flex items-center"
        >
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar & Filters */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
          {/* Calendar */}
          <ReminderCalendar
            reminders={reminders}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
          />
          
          {/* Filters */}
          <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
            <CardBody className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-[#f7eccf]/10 rounded-full mr-3">
                  <ListFilter className="h-5 w-5 text-[#f7eccf]" />
                </div>
                <h3 className="text-lg font-semibold text-[#f7eccf]">Filters</h3>
              </div>
              
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'All Reminders', icon: <Bell className="h-4 w-4" /> },
                  { id: 'date', label: format(selectedDate, 'MMMM d, yyyy'), icon: <CalendarClock className="h-4 w-4" /> },
                  { id: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4" /> },
                  { id: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" /> },
                ].map((filter) => (
                  <motion.button
                    key={filter.id}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      'w-full flex items-center px-4 py-3 rounded-xl text-left transition-all',
                      activeFilter === filter.id
                        ? 'bg-[#f7eccf] text-[#1C1C1C]'
                        : 'bg-[#f7eccf]/5 text-[#f7eccf] hover:bg-[#f7eccf]/10'
                    )}
                  >
                    <span className={cn(
                      'p-1.5 rounded-full mr-3',
                      activeFilter === filter.id
                        ? 'bg-[#1C1C1C]/10'
                        : 'bg-[#f7eccf]/10'
                    )}>
                      {filter.icon}
                    </span>
                    <span className="font-medium">{filter.label}</span>
                    
                    {filter.id !== 'date' && (
                      <span className={cn(
                        'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
                        activeFilter === filter.id
                          ? 'bg-[#1C1C1C]/10 text-[#1C1C1C]'
                          : 'bg-[#f7eccf]/10 text-[#f7eccf]/70'
                      )}>
                        {filter.id === 'all' ? reminders.length :
                         filter.id === 'pending' ? reminders.filter(r => !r.is_completed).length :
                         filter.id === 'completed' ? reminders.filter(r => r.is_completed).length : 0}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>
        
        {/* Reminders List */}
        <div className="lg:col-span-2">
          <motion.div variants={itemVariants}>
            <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-[#f7eccf]">
                      {activeFilter === 'all' ? 'All Reminders' :
                       activeFilter === 'date' ? `Reminders for ${format(selectedDate, 'MMMM d, yyyy')}` :
                       activeFilter === 'pending' ? 'Pending Reminders' :
                       'Completed Reminders'}
                    </h3>
                    <span className="ml-3 px-2 py-0.5 rounded-full text-xs font-medium bg-[#f7eccf]/10 text-[#f7eccf]/70">
                      {filteredReminders.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={handleAddReminder}
                      className="p-2 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                    >
                      <Plus className="h-5 w-5" />
                    </motion.button>
                    
                    <motion.button
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="p-2 rounded-full bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-16">
                    <motion.div 
                      className="w-12 h-12 rounded-full border-2 border-[#f7eccf] border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                ) : filteredReminders.length === 0 ? (
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                      <Bell className="h-8 w-8 text-[#f7eccf]/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No reminders found</h3>
                    <p className="text-[#f7eccf]/70 max-w-md mx-auto mb-6">
                      {activeFilter === 'all'
                        ? "You don't have any reminders yet. Create your first reminder to get started."
                        : activeFilter === 'date'
                        ? `No reminders scheduled for ${format(selectedDate, 'MMMM d, yyyy')}.`
                        : activeFilter === 'pending'
                        ? "You don't have any pending reminders."
                        : "You don't have any completed reminders."}
                    </p>
                    
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="inline-block"
                    >
                      <Button
                        onClick={handleAddReminder}
                        className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-xl px-5 py-2.5 flex items-center gap-2"
                      >
                        <Plus size={18} />
                        <span>Add Reminder</span>
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <div className="space-y-4 mt-2">
                    <AnimatePresence>
                      {filteredReminders.map((reminder) => (
                        <motion.div
                          key={reminder.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ReminderCard
                            reminder={reminder}
                            onComplete={handleCompleteReminder}
                            onEdit={handleEditReminder}
                            onDelete={handleDeleteReminder}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveReminder}
        reminder={editingReminder}
        title={editingReminder ? 'Edit Reminder' : 'Create Reminder'}
      />
    </motion.div>
  )
}