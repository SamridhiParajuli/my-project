// app/(dashboard)/inventory/page.tsx
// TODO: issue with filtering system. Fix it
'use client'

import { useState } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Package, 
  Plus, 
  ChevronRight, 
  Search, 
  Filter, 
  SortDesc, 
  Calendar, 
  CheckCircle,
  AlertCircle
} from 'lucide-react'

// Animation variants
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

const buttonVariants = {
  hover: { 
    scale: 1.05,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
  },
  tap: { 
    scale: 0.95 
  }
}

export default function InventoryPage() {
  const { isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Demo inventory requests
  const requests = [
    { 
      id: 1, 
      title: "Dairy order shortage", 
      description: "Missing 12 cases of organic milk from last order",
      requestingDept: "Dairy",
      fulfillingDept: "Receiving",
      requestedBy: "Jane Smith",
      priority: "high",
      status: "pending",
      dateNeeded: "2025-06-21"
    },
    { 
      id: 2, 
      title: "Additional produce needed", 
      description: "Need extra strawberries for weekend sale",
      requestingDept: "Produce",
      fulfillingDept: "Receiving",
      requestedBy: "Mike Johnson",
      priority: "medium",
      status: "in_progress",
      dateNeeded: "2025-06-22"
    },
    { 
      id: 3, 
      title: "Special order - gluten free flour", 
      description: "Customer ordered 10 bags of specialty flour",
      requestingDept: "Grocery",
      fulfillingDept: "Receiving",
      requestedBy: "Sarah Williams",
      priority: "low",
      status: "approved",
      dateNeeded: "2025-06-24"
    },
    { 
      id: 4, 
      title: "Bakery supplies restock", 
      description: "Need decoration tools and ingredients for upcoming events",
      requestingDept: "Bakery",
      fulfillingDept: "Receiving",
      requestedBy: "David Chen",
      priority: "medium",
      status: "completed",
      dateNeeded: "2025-06-20"
    },
  ]
  
  // Filter requests based on active tab and search term
  const filteredRequests = requests.filter(request => {
    const matchesTab = activeTab === 'all' || request.status === activeTab;
    const matchesSearch = searchTerm === '' || 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestingDept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  })
  
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
                  <Package className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Inventory Management</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Track inventory requests and stock levels
                  </p>
                </div>
              </div>
              
              {isManager && (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                  >
                    <Plus size={18} />
                    <span>New Request</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Filter and Search Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap bg-[#f7eccf]/10 p-1 rounded-xl">
                {['all', 'pending', 'in_progress', 'approved', 'completed'].map((tab) => (
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
                    {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
                  </motion.button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search inventory requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>

            {/* Filter Options */}
            <div className="flex items-center mt-4 pt-4 border-t border-[#f7eccf]/10">
              <span className="text-sm text-[#f7eccf]/70 mr-3">Filter by:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Departments' },
                  { value: 'dairy', label: 'Dairy' },
                  { value: 'produce', label: 'Produce' },
                  { value: 'bakery', label: 'Bakery' },
                  { value: 'grocery', label: 'Grocery' }
                ].map(option => (
                  <motion.button
                    key={option.value}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      option.value === 'all'
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
                className="p-2 ml-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Sort by date"
              >
                <SortDesc size={16} />
              </motion.button>
              <motion.button
                className="p-2 ml-1 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Advanced filters"
              >
                <Filter size={16} />
              </motion.button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-[#f7eccf]/50" />
          </div>
          <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No requests found</h3>
          <p className="text-[#f7eccf]/70 max-w-md mx-auto">
            {searchTerm 
              ? "No requests match your search criteria. Try adjusting your search."
              : activeTab !== 'all'
                ? `No ${activeTab.replace('_', ' ')} requests found.`
                : "No inventory requests have been created yet."}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredRequests.map(request => (
            <motion.div 
              key={request.id} 
              variants={cardVariants}
              whileHover="hover"
              className="relative"
            >
              <Card className={`border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl ${
                request.priority === 'high' ? 'border-l-4 border-red-500' : ''
              }`}>
                <CardBody className="p-6">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-3">
                        <h3 className="text-lg font-medium text-[#f7eccf]">{request.title}</h3>
                        <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                          request.priority === 'high' 
                            ? 'bg-red-500/20 text-red-500' 
                            : request.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-green-500/20 text-green-500'
                        }`}>
                          {request.priority === 'high' ? 'High Priority' : 
                           request.priority === 'medium' ? 'Medium Priority' : 'Low Priority'}
                        </span>
                        <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                          request.status === 'completed' 
                            ? 'bg-green-500/20 text-green-500' 
                            : request.status === 'approved'
                            ? 'bg-blue-500/20 text-blue-500'
                            : request.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-[#f7eccf]/20 text-[#f7eccf]/90'
                        }`}>
                          {request.status === 'in_progress' ? 'In Progress' : 
                           request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-[#f7eccf]/80 mb-4">{request.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-[#f7eccf]/60">
                        <div className="flex items-center">
                          <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                          <span>From: {request.requestingDept}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                          <span>To: {request.fulfillingDept}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                          <span>Requested by: {request.requestedBy}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-2 text-[#f7eccf]/40" />
                          <span>Needed by: {request.dateNeeded}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col mt-4 md:mt-0 md:ml-6 md:min-w-[140px] justify-end gap-2">
                      {request.status !== 'completed' && (
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1"
                            size="sm"
                          >
                            Update Status
                          </Button>
                        </motion.div>
                      )}
                      
                      <motion.div
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-[#f7eccf]/30 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-xl flex items-center justify-center gap-1"
                        >
                          View Details
                          <ChevronRight size={14} />
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