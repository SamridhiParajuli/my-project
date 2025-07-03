'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody } from '@/components/ui/Card'

export default function Dashboard() {
  const { user, department, isAdmin, isManager } = useAuth()
  const router = useRouter()
  
  // Function to get department display text
  const getDepartmentDisplay = () => {
    if (department?.name) {
      return department.name
    }
    if (user?.department_id) {
      return `Dept ${user.department_id}`
    }
    return 'All Departments'
  }

  // Function to get department text for messages
  const getDepartmentText = () => {
    if (department?.name) {
      return department.name
    }
    if (user?.department_id) {
      return `Department #${user.department_id}`
    }
    return 'your department'
  }
  
  // Role-specific welcome messages
  const getRoleMessage = () => {
    if (isAdmin) {
      return "As Store Manager, you have full access to all system features."
    } else if (isManager) {
      return `As Department Manager for ${getDepartmentText()}, you have access to manage your team and inventory.`
    } else {
      return `As staff in ${getDepartmentText()}, you can view tasks and announcements.`
    }
  }
  
  // Define module cards based on user role
  const getModules = () => {
    // Common modules for all users
    const commonModules = [
      {
        title: "Tasks",
        description: "View and manage daily tasks",
        path: "/tasks",
        color: "accent-green",
        count: 12
      },
      {
        title: "Announcements",
        description: "View important store announcements",
        path: "/announcements",
        color: "accent-blue",
        count: 5
      },
    ]

    // Staff modules
    const staffModules = [
      {
        title: "Pre-Orders",
        description: "Handle customer pre-orders and special requests",
        path: "/preorders",
        color: "gold",
        count: 8
      },
      {
        title: "Customer Complaints",
        description: "Handle and resolve customer complaints",
        path: "/complaints",
        color: "accent-red",
        count: 3
      },
      {
        title: "Temperature Monitoring",
        description: "Monitor temperature points across the store",
        path: "/temperature",
        color: "accent-blue",
        count: 24
      },
    ]

    // Manager modules
    const managerModules = [
      {
        title: "Inventory",
        description: "Manage inventory requests and stock levels",
        path: "/inventory",
        color: "accent-green",
        count: 15
      },
      {
        title: "Equipment",
        description: "Manage store equipment and maintenance",
        path: "/equipment",
        color: "gold",
        count: 18
      },
      {
        title: "Employees",
        description: "Manage employee information and records",
        path: "/employees",
        color: "accent-red",
        count: 32
      },
      {
        title: "Departments",
        description: "Manage store departments and structure",
        path: "/departments",
        color: "accent-green",
        count: 6
      },
      {
        title: "Training",
        description: "Manage employee training and certifications",
        path: "/training",
        color: "accent-blue",
        count: 15
      },
    ]

    // Admin modules
    const adminModules = [
      {
        title: "Users",
        description: "Manage system users and access",
        path: "/users",
        color: "gold",
        count: 25
      },
      {
        title: "Permissions",
        description: "Manage role-based permissions",
        path: "/permissions",
        color: "accent-red",
        count: 10
      }
    ]

    // Combine modules based on role
    if (isAdmin) {
      return [...commonModules, ...staffModules, ...managerModules, ...adminModules]
    } else if (isManager) {
      return [...commonModules, ...staffModules, ...managerModules]
    } else {
      return [...commonModules, ...staffModules]
    }
  }

  const modules = getModules()

  // Utility function to get background color classes
  const getBgColorClass = (color: string) => {
    switch (color) {
      case 'accent-green': return 'bg-accent-green';
      case 'gold': return 'bg-gold';
      case 'accent-red': return 'bg-accent-red';
      case 'accent-blue': return 'bg-accent-blue';
      default: return 'bg-dark-800';
    }
  }

  // Utility function to get text color classes
  const getTextColorClass = (color: string) => {
    switch (color) {
      case 'accent-green': return 'text-accent-green';
      case 'gold': return 'text-gold';
      case 'accent-red': return 'text-accent-red';
      case 'accent-blue': return 'text-accent-blue';
      default: return 'text-dark-800';
    }
  }

  // Utility function to get badge background color
  const getBadgeBgClass = (color: string) => {
    switch (color) {
      case 'accent-green': return 'bg-accent-green/10';
      case 'gold': return 'bg-gold/10';
      case 'accent-red': return 'bg-accent-red/10';
      case 'accent-blue': return 'bg-accent-blue/10';
      default: return 'bg-dark-800/10';
    }
  }

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-dark-900">Welcome back, {user?.username}</h2>
              <p className="text-dark-600">
                {isAdmin 
                  ? 'Here\'s a complete overview of your store operations'
                  : isManager 
                  ? `Here's what's happening in your ${department?.name ? department.name : (user?.department_id ? `department (#${user.department_id})` : 'store')}`
                  : 'Here\'s what you need to know today'
                }
              </p>
              <p className="mt-2 text-sm text-dark-500">
                {getRoleMessage()}
              </p>
            </div>
            <div className={`px-4 py-1 rounded-full text-sm mt-4 sm:mt-0 inline-flex ${
              user?.role === 'admin' 
                ? 'bg-accent-red/10 text-accent-red' 
                : user?.role === 'manager' 
                ? 'bg-gold/10 text-gold' 
                : 'bg-accent-green/10 text-accent-green'
            }`}>
              {user?.role} • {getDepartmentDisplay()}
            </div>
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className={`h-1 ${getBgColorClass(module.color)}`}></div>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-dark-800">{module.title}</h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getBadgeBgClass(module.color)} ${getTextColorClass(module.color)}`}>
                  {module.count}
                </span>
              </div>
              <p className="text-dark-600 text-sm mt-2 min-h-[40px]">{module.description}</p>
              <button
                onClick={() => router.push(module.path)}
                className={`inline-flex items-center font-medium text-sm mt-4 transition-opacity hover:opacity-80 ${getTextColorClass(module.color)}`}
              >
                View Details
                <svg className="ml-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}