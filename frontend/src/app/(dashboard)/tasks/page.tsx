// app/(dashboard)/tasks/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import TasksList from './TasksList'
import { Task } from '@/types'

export default function TasksPage() {
  const { user, isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('pending')
  
  // Demo tasks data (fallback if API fails)
  const demoTasks: Task[] = [
  { 
    id: 1, 
    title: "Restock dairy cooler", 
    description: "Ensure all dairy products are properly stocked",
    status: "pending", 
    is_urgent: true, // Replace priority with is_urgent
    due_date: "2025-06-22", // Use due_date instead of dueDate
    assigned_to: 101, // Use assigned_to instead of assignedTo (as a number)
    department_id: 1,
    created_at: new Date().toISOString() 
  },
  { 
    id: 2, 
    title: "Clean bakery display cases", 
    status: "in_progress", 
    is_urgent: false,
    due_date: "2025-06-21", 
    assigned_to: 102,
    department_id: 2,
    created_at: new Date().toISOString()
  },
  // More tasks...
];
    const getPriorityFromTask = (task: Task): string => {
    return task.is_urgent ? 'high' : 'normal';
    }
  
  // Filter tasks based on user's department and active tab
  const getDepartmentFilteredTasks = () => {
    let filtered = [...demoTasks];
    
    // Apply department filter for non-admin users
    if (user && user.role !== 'admin' && user.department_id) {
      filtered = filtered.filter(task => task.department_id === user.department_id);
    }
    
    // Apply status filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(task => task.status === activeTab);
    }
    
    return filtered;
  }
  
  const filteredDemoTasks = getDepartmentFilteredTasks();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Tasks Management</h2>
              <p className="text-dark-600">
                {user?.department_id 
                  ? `Tasks for Department #${user.department_id}` 
                  : 'All department tasks'
                }
              </p>
            </div>
            {isManager && (
              <button className="bg-dark-800 text-cream-100 px-4 py-2 rounded-lg hover:bg-dark-900 transition-colors">
                + New Task
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6 overflow-x-auto">
            {['all', 'pending', 'in_progress', 'completed'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab 
                    ? 'border-b-2 border-accent-blue text-accent-blue' 
                    : 'text-dark-600 hover:text-dark-800'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          
          {/* API-based Tasks List Component */}
          <TasksList fallbackData={filteredDemoTasks} activeTab={activeTab} />
          
          {/* Fallback UI in case the TasksList component fails to load */}
          <div className="mt-4 hidden">
            <h3 className="text-lg font-medium mb-3">Demo Tasks</h3>
            <div className="space-y-4">
              {filteredDemoTasks.length > 0 ? (
                filteredDemoTasks.map(task => (
                  <div key={task.id} className="p-4 border border-cream-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-dark-800">{task.title}</h3>
                        <p className="text-sm text-dark-600">Assigned to: {task.assigned_to}</p>
                        <p className="text-sm text-dark-600">Department: {task.department_id}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          getPriorityFromTask(task) === 'high' 
                            ? 'bg-accent-red/10 text-accent-red' 
                            : getPriorityFromTask(task) === 'high'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-green/10 text-accent-green'
                        }`}>
                          {getPriorityFromTask(task) === 'high'}
                        </span>
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
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-dark-500">Due: {getPriorityFromTask(task) === 'Due'}</span>
                      <button className="text-accent-blue text-sm hover:underline">View Details</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-dark-600">No tasks found in this category</div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}