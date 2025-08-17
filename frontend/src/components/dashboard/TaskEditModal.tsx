// app/(dashboard)/tasks/components/TaskEditModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { 
  X,
  Save,
  ChevronDown,
  Calendar,
  Flag
} from 'lucide-react'

interface Department {
  id: number
  name: string
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  department_id: number
  position: string
}

interface TaskEditModalProps {
  task: any
  onClose: () => void
  onTaskUpdated: (task: any) => void
}

export default function TaskEditModal({ task, onClose, onTaskUpdated }: TaskEditModalProps) {
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    department_id: task.department_id || null,
    assigned_to: task.assigned_to || null,
    assigned_to_department: task.assigned_to_department || null,
    is_urgent: task.is_urgent || false,
    due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    status: task.status || 'pending'
  })
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments
        const deptsResponse = await api.get('/departments')
        if (deptsResponse.data && deptsResponse.data.items) {
          setDepartments(deptsResponse.data.items)
        }
        
        // Fetch employees
        const empsResponse = await api.get('/employees', { 
          params: { status: 'active' } 
        })
        
        if (empsResponse.data && empsResponse.data.items) {
          setEmployees(empsResponse.data.items)
        }
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError('Failed to load form data')
      }
    }
    
    fetchData()
  }, [])
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else if (name === 'department_id' || name === 'assigned_to' || name === 'assigned_to_department') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }
  
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const departmentId = e.target.value === '' ? null : Number(e.target.value)
    
    setFormData(prev => ({
      ...prev,
      department_id: departmentId,
      assigned_to: null // Reset the assigned employee when department changes
    }))
  }
  
  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!formData.title) {
        setError('Title is required')
        setLoading(false)
        return
      }
      
      const response = await api.put(`/tasks/${task.id}`, formData)
      onTaskUpdated(response.data)
    } catch (err: any) {
      console.error('Error updating task:', err)
      setError(err.response?.data?.detail || 'Failed to update task')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        className="bg-[#1C1C1C] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6 border-b border-[#f7eccf]/10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#f7eccf]">Edit Task</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#f7eccf]/10 text-[#f7eccf]/70 hover:text-[#f7eccf] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-xl text-red-500 mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                Title*
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                Department
              </label>
              <div className="relative">
                <select
                  name="department_id"
                  value={formData.department_id || ''}
                  onChange={handleDepartmentChange}
                  className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                >
                  <option value="" className="bg-[#1C1C1C]">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id} className="bg-[#1C1C1C]">
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Assign To
                </label>
                <div className="relative">
                  <select
                    name="assigned_to"
                    value={formData.assigned_to || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  >
                    <option value="" className="bg-[#1C1C1C]">Select Employee</option>
                    {employees
                      .filter(emp => 
                        !formData.department_id || emp.department_id === formData.department_id
                      )
                      .map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-[#1C1C1C]">
                          {emp.first_name} {emp.last_name} ({emp.position})
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  or Assign To Department
                </label>
                <div className="relative">
                  <select
                    name="assigned_to_department"
                    value={formData.assigned_to_department || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    disabled={formData.assigned_to !== null}
                  >
                    <option value="" className="bg-[#1C1C1C]">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id} className="bg-[#1C1C1C]">
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Due Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <Calendar size={16} />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                  Status
                </label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  >
                    <option value="pending" className="bg-[#1C1C1C]">Pending</option>
                    <option value="in_progress" className="bg-[#1C1C1C]">In Progress</option>
                    <option value="completed" className="bg-[#1C1C1C]">Completed</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center py-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="is_urgent"
                  name="is_urgent"
                  checked={formData.is_urgent}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-all ${formData.is_urgent ? 'bg-red-500' : 'bg-[#f7eccf]/20'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-all ${formData.is_urgent ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm text-[#f7eccf] flex items-center">
                  <Flag size={14} className="mr-1" />
                  Urgent Priority
                </span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
              ></textarea>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-[#f7eccf]/10 flex justify-end">
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              className="bg-[#f7eccf]/10 text-[#f7eccf] hover:bg-[#f7eccf]/20 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-xl flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#1C1C1C] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}