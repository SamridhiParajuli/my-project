// app/(dashboard)/tasks/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import { SearchBar } from '@/components/ui/SearchBar'
import { 
  Clipboard,
  AlertCircle, 
  Check, 
  Clock, 
  Calendar,
  Plus,
  X,
  ChevronDown,
  Users,
  UserCheck,
  SortAsc,
  SortDesc,
  Filter,
  CheckCircle,
  XCircle,
  Flag,
  ArrowRight,
  ExternalLink
} from 'lucide-react'

// Define animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const cardVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  hover: {
    y: -8,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    transition: { duration: 0.3 }
  }
}

const formVariants: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  visible: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const buttonVariants = {
  hover: { 
    scale: 1.05,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
  },
  tap: { 
    scale: 0.95 
  }
}

interface Task {
  id: number
  title: string
  description: string
  department_id: number
  department_name?: string
  assigned_by: number
  assigned_by_name?: string
  assigned_to: number | null
  assigned_to_name?: string
  assigned_to_department: number | null
  assigned_to_department_name?: string
  status: string
  is_urgent: boolean
  due_date: string | null
  created_at: string
  completed_at: string | null
  is_completed: boolean
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  department_id: number
  position: string
  department_name?: string
}

interface Department {
  id: number
  name: string
  department_code?: string
  description?: string
}

export default function TasksPage() {
  const { user, isManager, isAdmin } = useAuth()
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<string>('created_at')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_id: user?.department_id || null,
    assigned_to: null,
    assigned_to_department: null,
    due_date: '',
    is_urgent: false,
    status: 'pending'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch departments for the dropdown
        const deptsResponse = await api.get('/departments')
        if (deptsResponse.data && deptsResponse.data.items) {
          setDepartments(deptsResponse.data.items)
        }

        // Fetch employees for assignment
        const empsResponse = await api.get('/employees', { 
          params: { 
            status: 'active',
            ...(user?.department_id && !isAdmin ? { department_id: user.department_id } : {})
          } 
        })
        
        if (empsResponse.data && empsResponse.data.items) {
          setEmployees(empsResponse.data.items)
        }

        // Fetch tasks with appropriate filtering
        let endpoint = '/tasks';
        const params: any = {
          ...(activeTab !== 'all' ? { status: activeTab } : {})
        }

        // If user is not admin and has department, either fetch department tasks or assigned tasks
        if (!isAdmin && user?.department_id) {
          if (isManager) {
            // Managers see all tasks in their department
            endpoint = `/tasks/department/${user.department_id}`;
          } else {
            // Staff sees tasks assigned to them
            params.assigned_to = user.employee_id;
          }
        }

        const response = await api.get(endpoint, { params })

        if (response.data && response.data.items) {
          setTasks(response.data.items)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching tasks:', err)
        setError(err.response?.data?.detail || 'Failed to load tasks')
        setLoading(false)
      }
    }

    fetchData()
  }, [user, activeTab, isAdmin, isManager])

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

  const handleCreateTask = async () => {
    try {
      if (!formData.title || !formData.description) {
        setError('Title and description are required')
        return
      }
      
      const payload = {
        ...formData,
        assigned_by: user?.employee_id
      }
      
      await api.post('/tasks', payload)
      setShowForm(false)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        department_id: user?.department_id || null,
        assigned_to: null,
        assigned_to_department: null,
        due_date: '',
        is_urgent: false,
        status: 'pending'
      })
      
      // Refresh tasks list
      let endpoint = '/tasks';
      const params: any = {}
      
      if (activeTab !== 'all') {
        params.status = activeTab
      }
      
      if (!isAdmin && user?.department_id) {
        if (isManager) {
          endpoint = `/tasks/department/${user.department_id}`;
        } else {
          params.assigned_to = user.employee_id
        }
      }
      
      const response = await api.get(endpoint, { params })
      if (response.data && response.data.items) {
        setTasks(response.data.items)
      }
      
      setError(null)
    } catch (err: any) {
      console.error('Error creating task:', err)
      setError(err.response?.data?.detail || 'Failed to create task')
    }
  }
  
  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      
      // Update task in the list
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ))
    } catch (err: any) {
      console.error('Error updating task status:', err)
      setError(err.response?.data?.detail || 'Failed to update task status')
    }
  }

  const assignTask = async (taskId: number, employeeId: number | null, departmentId: number | null) => {
    try {
      const payload: any = {}
      
      if (employeeId !== null) {
        payload.assigned_to = employeeId
      }
      
      if (departmentId !== null) {
        payload.assigned_to_department = departmentId
      }
      
      await api.patch(`/tasks/${taskId}/assign`, payload)
      
      // Refresh tasks to get updated assignment info
      let endpoint = '/tasks';
      const params: any = {}
      
      if (activeTab !== 'all') {
        params.status = activeTab
      }
      
      if (!isAdmin && user?.department_id) {
        if (isManager) {
          endpoint = `/tasks/department/${user.department_id}`;
        } else {
          params.assigned_to = user.employee_id
        }
      }
      
      const response = await api.get(endpoint, { params })
      if (response.data && response.data.items) {
        setTasks(response.data.items)
      }
    } catch (err: any) {
      console.error('Error assigning task:', err)
      setError(err.response?.data?.detail || 'Failed to assign task')
    }
  }

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.department_name && task.department_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (task.assigned_to_name && task.assigned_to_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (task.assigned_by_name && task.assigned_by_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    // Handle sorting
    let valueA, valueB;

    switch (sortBy) {
      case 'due_date':
        valueA = a.due_date ? new Date(a.due_date).getTime() : 0;
        valueB = b.due_date ? new Date(b.due_date).getTime() : 0;
        break;
      case 'created_at':
        valueA = new Date(a.created_at).getTime();
        valueB = new Date(b.created_at).getTime();
        break;
      case 'title':
        valueA = a.title.toLowerCase();
        valueB = b.title.toLowerCase();
        break;
      default:
        valueA = new Date(a.created_at).getTime();
        valueB = new Date(b.created_at).getTime();
    }

    return sortOrder === 'asc' 
      ? (valueA > valueB ? 1 : -1)
      : (valueA < valueB ? 1 : -1);
  });

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
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
                  <Clipboard className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Task Management</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    {activeTab === 'pending' ? 'Manage pending tasks' : 
                     activeTab === 'in_progress' ? 'Track tasks in progress' : 
                     activeTab === 'completed' ? 'View completed tasks' : 
                     'All tasks overview'}
                  </p>
                </div>
              </div>
              
              {(isAdmin || isManager) && (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    onClick={toggleForm}
                    className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                  >
                    {showForm ? (
                      <>
                        <X size={18} />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        <span>Create New Task</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

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

      {/* Create Task Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            ref={formRef}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-[#f7eccf] flex items-center">
                  <Plus className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                  Create New Task
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex items-center">
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
                      <span className="ml-3 text-sm text-[#f7eccf]">
                        Urgent Priority
                      </span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#f7eccf]/80 mb-1.5">
                      Description*
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full p-3 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent transition-all"
                      required
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        onClick={handleCreateTask}
                        className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-full shadow-md px-6 py-3 flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Create Task
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              {/* Navigation Tabs */}
              <div className="flex-col flex md:flex-row space-1 bg-[#f7eccf]/10 p-1 rounded-xl">
                {['pending', 'in_progress', 'completed', 'all'].map((tab) => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                      activeTab === tab 
                        ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                        : 'text-[#f7eccf]/70 hover:text-[#f7eccf]'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {activeTab === tab && (
                      <motion.div
                        className="absolute inset-0 bg-[#f7eccf] rounded-lg"
                        layoutId="tabBackground"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    {tab === 'pending' ? 'Pending' : 
                     tab === 'in_progress' ? 'In Progress' : 
                     tab === 'completed' ? 'Completed' : 'All'}
                  </motion.button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center mt-4 pt-4 border-t border-[#f7eccf]/10">
              <span className="text-sm text-[#f7eccf]/70 mr-3">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { value: 'created_at', label: 'Date Created' },
                  { value: 'due_date', label: 'Due Date' },
                  { value: 'title', label: 'Title' }
                ].map(option => (
                  <motion.button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      sortBy === option.value
                        ? 'bg-[#f7eccf] text-[#1C1C1C]'
                        : 'bg-[#f7eccf]/10 text-[#f7eccf]/70 hover:bg-[#f7eccf]/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
              <motion.button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 ml-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
              >
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </motion.button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Tasks List */}
      {loading ? (
        <motion.div 
          variants={itemVariants} 
          className="flex justify-center items-center py-16"
        >
          <motion.div 
            className="w-12 h-12 rounded-full border-2 border-[#f7eccf] border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      ) : filteredTasks.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-[#f7eccf]/50" />
          </div>
          <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No tasks found</h3>
          <p className="text-[#f7eccf]/70 max-w-md mx-auto">
            {searchTerm 
              ? "No tasks match your search criteria. Try adjusting your search."
              : activeTab !== 'all'
                ? `No ${activeTab.replace('_', ' ')} tasks found.`
                : "No tasks have been created yet."}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredTasks.map(task => (
            <motion.div 
              key={task.id} 
              variants={cardVariants}
              whileHover="hover"
              className="relative"
            >
              <Card className={`border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl ${
                task.is_urgent ? 'border-l-4 border-red-500' : ''
              }`}>
                <CardBody className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h3 className="text-lg font-medium text-[#f7eccf]">{task.title}</h3>
                        {task.is_urgent && (
                          <span className="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-500 flex items-center">
                            <Flag size={12} className="mr-1" />
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-[#f7eccf]/80 mb-4 line-clamp-2">{task.description}</p>
                      <div className="grid grid-cols-2 gap-y-2 text-sm text-[#f7eccf]/60">
                        <div className="flex items-center">
                          <Users size={14} className="mr-2 text-[#f7eccf]/40" />
                          <span>{task.department_name || 'No Department'}</span>
                        </div>
                        <div className="flex items-center">
                          <UserCheck size={14} className="mr-2 text-[#f7eccf]/40" />
                          <span>{task.assigned_by_name || 'System'}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                          <span>{task.assigned_to_name || 'Unassigned'}
                            {!task.assigned_to_name && task.assigned_to_department_name && 
                              ` (Dept: ${task.assigned_to_department_name})`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {task.due_date ? (
                            <>
                              <Calendar size={14} className="mr-2 text-[#f7eccf]/40" />
                              <span>{new Date(task.due_date).toLocaleDateString()}</span>
                            </>
                          ) : (
                            <>
                              <Clock size={14} className="mr-2 text-[#f7eccf]/40" />
                              <span>No due date</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col mt-4 md:mt-0 md:ml-6 md:min-w-[180px] justify-between">
                      <div className="mb-4">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ${
                          task.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                          task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                          'bg-green-500/20 text-green-500'
                        }`}>
                          {task.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {task.status === 'in_progress' && <ArrowRight size={12} className="mr-1" />}
                          {task.status === 'completed' && <Check size={12} className="mr-1" />}
                          {task.status === 'pending' ? 'Pending' :
                          task.status === 'in_progress' ? 'In Progress' :
                          'Completed'}
                        </span>
                      </div>
                      
                      {(isAdmin || isManager || user?.employee_id === task.assigned_to) && task.status !== 'completed' && (
                        <div className="space-y-2">
                          {task.status === 'pending' && (
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                                size="sm"
                              >
                                <ArrowRight size={14} />
                                Start Task
                              </Button>
                            </motion.div>
                          )}
                          {task.status === 'in_progress' && (
                            <motion.div
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Button
                                onClick={() => updateTaskStatus(task.id, 'completed')}
                                className="w-full bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-2 rounded-xl flex items-center justify-center gap-1"
                                size="sm"
                              >
                                <Check size={14} />
                                Complete Task
                              </Button>
                            </motion.div>
                          )}
                          
                          {(isAdmin || isManager) && !task.assigned_to && (
                            <div className="relative">
                              <select
                                onChange={(e) => {
                                  const selectedEmployeeId = e.target.value ? parseInt(e.target.value) : null;
                                  if (selectedEmployeeId) {
                                    assignTask(task.id, selectedEmployeeId, null);
                                  }
                                }}
                                className="w-full p-2 text-xs bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                                defaultValue=""
                              >
                                <option value="" disabled className="bg-[#1C1C1C]">Assign to employee</option>
                                {employees
                                  .filter(emp => !task.department_id || emp.department_id === task.department_id)
                                  .map(emp => (
                                    <option key={emp.id} value={emp.id} className="bg-[#1C1C1C]">
                                      {emp.first_name} {emp.last_name}
                                    </option>
                                  ))
                                }
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#f7eccf]/50">
                                <ChevronDown size={14} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <motion.div
  variants={buttonVariants}
  whileHover="hover"
  whileTap="tap"
  className="mt-2"
>
  <Button
    variant="outline"
    size="sm"
    className="w-full border-[#f7eccf]/30 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-xl flex items-center justify-center gap-1"
    onClick={() => router.push(`/tasks/${task.id}`)}
  >
    <ExternalLink size={14} />
    View Details
  </Button>
</motion.div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}