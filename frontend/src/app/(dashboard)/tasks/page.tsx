// app/(dashboard)/tasks/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/services/api'
import SearchBar from '@/components/ui/SearchBar'

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

  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
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
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-primary">Task Management</h1>
        {(isAdmin || isManager) && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white"
          >
            {showForm ? 'Cancel' : 'Create New Task'}
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-accent-red/10 text-accent-red p-4 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Title*
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Department
                </label>
                <select
                  name="department_id"
                  value={formData.department_id || ''}
                  onChange={handleDepartmentChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Assign To
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select Employee</option>
                  {employees
                    .filter(emp => 
                      !formData.department_id || emp.department_id === formData.department_id
                    )
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.position})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  or Assign To Department
                </label>
                <select
                  name="assigned_to_department"
                  value={formData.assigned_to_department || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_urgent"
                  name="is_urgent"
                  checked={formData.is_urgent}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="is_urgent" className="ml-2 block text-sm text-primary">
                  Urgent
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-primary mb-1">
                  Description*
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full p-2 border rounded-md"
                  required
                ></textarea>
              </div>

              <div className="md:col-span-2">
                <Button
                  onClick={handleCreateTask}
                  className="bg-primary text-white"
                >
                  Create Task
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'in_progress'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary-light hover:text-primary hover:border-primary-light'
              }`}
            >
              All
            </button>
          </nav>
        </div>

        <div className="p-4">
          <SearchBar
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTasks.map(task => (
                <Card key={task.id} className={`${task.is_urgent ? 'border-l-4 border-accent-red' : ''}`}>
                  <CardBody>
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-medium text-primary">{task.title}</h3>
                          {task.is_urgent && (
                            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-accent-red text-white">
                              URGENT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-2">
                          <div>
                            <span className="font-semibold">Department:</span> {task.department_name || 'Not assigned'}
                          </div>
                          <div>
                            <span className="font-semibold">Assigned by:</span> {task.assigned_by_name || 'System'}
                          </div>
                          <div>
                            <span className="font-semibold">Assigned to:</span> {task.assigned_to_name || 'Unassigned'}
                            {!task.assigned_to_name && task.assigned_to_department_name && ` (Department: ${task.assigned_to_department_name})`}
                          </div>
                          <div>
                            <span className="font-semibold">Due date:</span> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not specified'}
                          </div>
                          <div>
                            <span className="font-semibold">Created:</span> {new Date(task.created_at).toLocaleDateString()}
                          </div>
                          {task.completed_at && (
                            <div>
                              <span className="font-semibold">Completed:</span> {new Date(task.completed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between mt-4 md:mt-0 md:ml-4">
                        <div className="mb-2">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.status === 'pending' ? 'Pending' :
                            task.status === 'in_progress' ? 'In Progress' :
                            'Completed'}
                          </span>
                        </div>
                        {(isAdmin || isManager || user?.employee_id === task.assigned_to) && task.status !== 'completed' && (
                          <div className="flex flex-col space-y-2">
                            {task.status === 'pending' && (
                              <Button
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                className="bg-blue-500 text-white text-xs px-2 py-1"
                                size="sm"
                              >
                                Start
                              </Button>
                            )}
                            {task.status === 'in_progress' && (
                              <Button
                                onClick={() => updateTaskStatus(task.id, 'completed')}
                                className="bg-green-500 text-white text-xs px-2 py-1"
                                size="sm"
                              >
                                Complete
                              </Button>
                            )}
                            {(isAdmin || isManager) && !task.assigned_to && (
                              <select
                                onChange={(e) => {
                                  const selectedEmployeeId = e.target.value ? parseInt(e.target.value) : null;
                                  if (selectedEmployeeId) {
                                    assignTask(task.id, selectedEmployeeId, null);
                                  }
                                }}
                                className="mt-2 p-1 text-xs border border-gray-300 rounded"
                                defaultValue=""
                              >
                                <option value="" disabled>Assign to employee</option>
                                {employees
                                  .filter(emp => !task.department_id || emp.department_id === task.department_id)
                                  .map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.first_name} {emp.last_name}
                                    </option>
                                  ))
                                }
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}