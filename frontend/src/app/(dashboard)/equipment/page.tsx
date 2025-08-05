// app/(dashboard)/equipment/page.tsx

'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { 
  PencilRuler, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  PenTool,
  Settings,
  Shield
} from 'lucide-react'

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  }
}

const cardVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }
  },
  hover: {
    y: -8,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.3 }
  }
}

export default function EquipmentPage() {
  const { isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('equipment')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  
  // Demo equipment data
  const equipmentList = [
    { 
      id: 1, 
      name: "Deli Slicer #2", 
      type: "Food Preparation",
      location: "Deli Department",
      status: "operational",
      department: "Deli",
      lastMaintenance: "2025-05-15",
      nextMaintenance: "2025-08-15"
    },
    { 
      id: 2, 
      name: "Walk-in Freezer", 
      type: "Refrigeration",
      location: "Back Room",
      status: "needs_maintenance",
      department: "Store-wide",
      lastMaintenance: "2025-03-10",
      nextMaintenance: "2025-06-10"
    },
    { 
      id: 3, 
      name: "Produce Scale #1", 
      type: "Measurement",
      location: "Produce Department",
      status: "needs_repair",
      department: "Produce",
      lastMaintenance: "2025-04-20",
      nextMaintenance: "2025-07-20"
    },
    { 
      id: 4, 
      name: "Coffee Grinder", 
      type: "Food Preparation",
      location: "Coffee/Tea Aisle",
      status: "operational",
      department: "Grocery",
      lastMaintenance: "2025-05-30",
      nextMaintenance: "2025-08-30"
    },
  ]
  
  // Demo repair requests
  const repairRequests = [
    {
      id: 1,
      equipment: "Produce Scale #1",
      issue: "Display not working properly, shows incorrect weights",
      urgency: "high",
      reportedBy: "Emily Johnson",
      reportedDate: "2025-06-18",
      status: "assigned",
      assignedTo: "Maintenance Team"
    },
    {
      id: 2,
      equipment: "Walk-in Freezer",
      issue: "Door seal is worn and not closing properly",
      urgency: "medium",
      reportedBy: "David Wilson",
      reportedDate: "2025-06-17",
      status: "pending",
      assignedTo: null
    },
    {
      id: 3,
      equipment: "Bakery Oven #2",
      issue: "Temperature control inconsistent",
      urgency: "medium",
      reportedBy: "Sarah Miller",
      reportedDate: "2025-06-15",
      status: "completed",
      assignedTo: "Oven Specialist"
    }
  ]
  
  // Demo maintenance schedule
  const maintenanceSchedule = [
    {
      id: 1,
      equipment: "Dairy Cooler",
      type: "Regular Maintenance",
      scheduledDate: "2025-06-25",
      assignedTo: "Refrigeration Team",
      status: "scheduled",
      notes: "Quarterly maintenance check"
    },
    {
      id: 2,
      equipment: "Meat Slicer #1",
      type: "Deep Cleaning",
      scheduledDate: "2025-06-22",
      assignedTo: "Food Safety Team",
      status: "scheduled",
      notes: "Monthly required cleaning"
    },
    {
      id: 3,
      equipment: "Checkout Register #3",
      type: "Software Update",
      scheduledDate: "2025-06-24",
      assignedTo: "IT Department",
      status: "scheduled",
      notes: "System software update required"
    }
  ]

  // Filter equipment based on search term
  const filteredEquipment = equipmentList.filter(item => 
    searchTerm === '' || 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter repair requests based on search term
  const filteredRepairs = repairRequests.filter(item => 
    searchTerm === '' || 
    item.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.assignedTo && item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter maintenance schedule based on search term
  const filteredMaintenance = maintenanceSchedule.filter(item => 
    searchTerm === '' || 
    item.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get status style
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'operational':
        return 'bg-green-500/10 text-green-500';
      case 'needs_maintenance':
        return 'bg-amber-500/10 text-amber-500';
      case 'needs_repair':
        return 'bg-red-500/10 text-red-500';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-500';
      case 'assigned':
        return 'bg-blue-500/10 text-blue-500';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  // Get urgency style
  const getUrgencyStyle = (urgency: string) => {
    switch(urgency) {
      case 'high':
        return 'bg-red-500/10 text-red-500';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500';
      case 'low':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };
  
  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Card */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
                  <PencilRuler className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Equipment Management</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Track equipment status, maintenance, and repairs
                  </p>
                </div>
              </div>
              
              {isManager && (
                <div className="flex gap-3">
                  <motion.button
                    className="px-4 py-2.5 bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] rounded-full flex items-center gap-2 font-medium shadow-md"
                    whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus size={18} />
                    <span>New Equipment</span>
                  </motion.button>
                  
                  <motion.button
                    className="px-4 py-2.5 bg-[#f7eccf] text-[#1C1C1C] rounded-full flex items-center gap-2 font-medium shadow-md"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <AlertCircle size={18} />
                    <span>Report Issue</span>
                  </motion.button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Search and filter bar */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              {/* Tabs */}
              <div className="flex-col flex md:flex-row space-1 bg-[#f7eccf]/10 p-1 rounded-xl">
                {['equipment', 'repairs', 'maintenance'].map((tab) => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
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
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </motion.button>
                ))}
              </div>
              
              {/* Search bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>
            
            {/* Sort options */}
            <div className="flex items-center pt-4 border-t border-[#f7eccf]/10 mt-4">
              <div className="flex items-center gap-2 text-[#f7eccf]/70 mr-3">
                <Filter size={16} />
                <span className="text-sm">Sort by:</span>
              </div>
              <div className="w-48 relative">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                >
                  <option value="name" className="bg-[#1C1C1C]">Name</option>
                  <option value="department" className="bg-[#1C1C1C]">Department</option>
                  <option value="status" className="bg-[#1C1C1C]">Status</option>
                  <option value="nextMaintenance" className="bg-[#1C1C1C]">Maintenance Date</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                  <ChevronDown size={14} />
                </div>
              </div>
              <motion.button
                className="ml-3 p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <RefreshCw size={16} />
              </motion.button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'equipment' && (
          <motion.div
            key="equipment"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                {filteredEquipment.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                      <Settings className="h-8 w-8 text-[#f7eccf]/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No equipment found</h3>
                    <p className="text-[#f7eccf]/70 max-w-md text-center">
                      Try adjusting your search criteria or add new equipment to your inventory.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#f7eccf]/10">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Equipment
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Next Maintenance
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f7eccf]/10">
                        {filteredEquipment.map((item, index) => (
                          <motion.tr 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-[#f7eccf]/5 transition-colors group"
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-xl bg-[#f7eccf]/10 flex items-center justify-center mr-3">
                                  <PenTool className="h-5 w-5 text-[#f7eccf]/70" />
                                </div>
                                <span className="font-medium text-[#f7eccf]">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">{item.type}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">{item.location}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusStyle(item.status)}`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">
                              <span className="px-3 py-1 rounded-full bg-[#f7eccf]/5 text-[#f7eccf]">
                                {item.department}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-[#f7eccf]/80">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                {item.nextMaintenance}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                <motion.button 
                                  className="px-3 py-1 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] text-sm hover:bg-[#f7eccf]/20 transition-colors"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ y: 0 }}
                                >
                                  Details
                                </motion.button>
                                <motion.button 
                                  className="px-3 py-1 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] text-sm hover:bg-[#f7eccf]/20 transition-colors"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ y: 0 }}
                                >
                                  Maintenance
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        )}

        {activeTab === 'repairs' && (
          <motion.div
            key="repairs"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredRepairs.length === 0 ? (
              <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
                <CardBody className="p-6">
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No repair requests found</h3>
                    <p className="text-[#f7eccf]/70 max-w-md text-center">
                      All equipment is currently operational or your search returned no results.
                    </p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              filteredRepairs.map((request, index) => (
                <motion.div 
                  key={request.id}
                  variants={cardVariants}
                  whileHover="hover"
                  custom={index}
                  className="relative"
                >
                  <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
                    <CardBody className="p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-[#f7eccf]">{request.equipment}</h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getUrgencyStyle(request.urgency)}`}>
                                {request.urgency.toUpperCase()} PRIORITY
                              </span>
                              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(request.status)}`}>
                                {request.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-[#f7eccf]/5 mb-4">
                            <p className="text-sm text-[#f7eccf]/90">{request.issue}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                              <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                                <Calendar size={14} className="text-[#f7eccf]/70" />
                              </div>
                              Reported: {request.reportedDate}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                              <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                                <Shield size={14} className="text-[#f7eccf]/70" />
                              </div>
                              Reported by: {request.reportedBy}
                            </div>
                          </div>
                          
                          {request.assignedTo && (
                            <div className="mt-4 p-3 rounded-xl bg-[#f7eccf]/5 inline-flex items-center">
                              <span className="text-sm text-[#f7eccf]/70 mr-2">Assigned to:</span>
                              <span className="text-sm font-medium text-[#f7eccf]">{request.assignedTo}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                          {request.status !== 'completed' && (
                            <motion.button
                              className="px-4 py-2 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium shadow-md flex items-center gap-2"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Update Status
                            </motion.button>
                          )}
                          <motion.button
                            className="px-4 py-2 rounded-xl bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] text-sm font-medium shadow-md flex items-center gap-2"
                            whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                            whileTap={{ scale: 0.98 }}
                          >
                            View Details
                          </motion.button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'maintenance' && (
          <motion.div
            key="maintenance"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                <h3 className="font-medium text-lg mb-4 text-[#f7eccf] flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                  Upcoming Maintenance
                </h3>
                
                {filteredMaintenance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-[#f7eccf]/5 rounded-2xl">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No maintenance scheduled</h3>
                    <p className="text-[#f7eccf]/70 max-w-md text-center">
                      There are no upcoming maintenance tasks scheduled.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#f7eccf]/10">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Equipment
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Scheduled Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Notes
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f7eccf]/10">
                        {filteredMaintenance.map((item, index) => (
                          <motion.tr 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-[#f7eccf]/5 transition-colors group"
                          >
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[#f7eccf]">
                              {item.equipment}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">
                              <span className="px-3 py-1 rounded-full bg-[#f7eccf]/5 text-[#f7eccf]">
                                {item.type}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-[#f7eccf]/80">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                {item.scheduledDate}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">{item.assignedTo}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusStyle(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">{item.notes}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <motion.button 
                                className="opacity-80 group-hover:opacity-100 px-3 py-1 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] text-sm hover:bg-[#f7eccf]/20 transition-colors flex items-center gap-1"
                                whileHover={{ y: -2, x: 2 }}
                                whileTap={{ y: 0 }}
                              >
                                Update
                                <ChevronRight size={14} />
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {isManager && (
                  <motion.div 
                    className="mt-6 flex justify-end"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.button
                      className="px-5 py-2.5 rounded-xl bg-[#f7eccf] text-[#1C1C1C] text-sm font-medium shadow-md flex items-center gap-2"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus size={16} />
                      Schedule Maintenance
                    </motion.button>
                  </motion.div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary card */}
      <motion.div variants={itemVariants}>
        <Card elevation="floating" className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-[#f7eccf]">Equipment Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div 
                className="p-4 bg-[#f7eccf]/5 rounded-2xl"
                whileHover={{ y: -5, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#f7eccf]/70">Total Equipment</span>
                  <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-[#f7eccf]" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#f7eccf]">{equipmentList.length}</p>
              </motion.div>
              
              <motion.div 
                className="p-4 bg-[#f7eccf]/5 rounded-2xl"
                whileHover={{ y: -5, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#f7eccf]/70">Operational</span>
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {equipmentList.filter(item => item.status === 'operational').length}
                </p>
              </motion.div>
              
              <motion.div 
                className="p-4 bg-[#f7eccf]/5 rounded-2xl"
                whileHover={{ y: -5, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#f7eccf]/70">Needs Maintenance</span>
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  {equipmentList.filter(item => item.status === 'needs_maintenance').length}
                </p>
              </motion.div>
              
              <motion.div 
                className="p-4 bg-[#f7eccf]/5 rounded-2xl"
                whileHover={{ y: -5, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#f7eccf]/70">Needs Repair</span>
                  <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {equipmentList.filter(item => item.status === 'needs_repair').length}
                </p>
              </motion.div>
            </div>
            
            <div className="mt-6 h-3 bg-[#f7eccf]/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-green-500"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(equipmentList.filter(item => item.status === 'operational').length / equipmentList.length) * 100}%` 
                }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <div className="mt-2 text-xs text-[#f7eccf]/70 text-right">
              {Math.round((equipmentList.filter(item => item.status === 'operational').length / equipmentList.length) * 100)}% operational
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  )
}