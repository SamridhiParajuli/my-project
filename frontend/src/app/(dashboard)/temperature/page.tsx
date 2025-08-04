// app/(dashboard)/temperature/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { SearchBar } from '@/components/ui/SearchBar'
import { 
  Thermometer,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Filter,
  Calendar,
  Clock,
  ChevronRight,
  RefreshCw,
  PlusCircle
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

export default function TemperaturePage() {
  const [activeTab, setActiveTab] = useState('monitoring')
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  
  // Demo temperature monitoring points
  const monitoringPoints = [
    { 
      id: 1, 
      name: "Dairy Cooler #1", 
      currentTemp: 38.2, 
      minTemp: 36.0,
      maxTemp: 40.0,
      lastChecked: "2025-06-20 09:15",
      nextCheck: "2025-06-20 13:15",
      status: "normal",
      department: "Dairy"
    },
    { 
      id: 2, 
      name: "Meat Display Case", 
      currentTemp: 32.7, 
      minTemp: 30.0,
      maxTemp: 34.0,
      lastChecked: "2025-06-20 09:30",
      nextCheck: "2025-06-20 13:30",
      status: "normal",
      department: "Meat"
    },
    { 
      id: 3, 
      name: "Freezer #2", 
      currentTemp: 5.8, 
      minTemp: -10.0,
      maxTemp: 10.0,
      lastChecked: "2025-06-20 08:45",
      nextCheck: "2025-06-20 12:45",
      status: "warning",
      department: "Frozen Foods"
    },
    { 
      id: 4, 
      name: "Prepared Foods Hot Bar", 
      currentTemp: 142.3, 
      minTemp: 140.0,
      maxTemp: 160.0,
      lastChecked: "2025-06-20 10:00",
      nextCheck: "2025-06-20 14:00",
      status: "normal",
      department: "Prepared Foods"
    },
    { 
      id: 5, 
      name: "Seafood Display", 
      currentTemp: 33.9, 
      minTemp: 30.0,
      maxTemp: 34.0,
      lastChecked: "2025-06-20 09:45",
      nextCheck: "2025-06-20 13:45",
      status: "danger",
      department: "Seafood"
    },
  ]
  
  // Demo temperature violations
  const violations = [
    {
      id: 1,
      pointName: "Seafood Display",
      recordedTemp: 35.7,
      allowedRange: "30.0°F - 34.0°F",
      recordedAt: "2025-06-20 09:45",
      recordedBy: "John Smith",
      status: "open",
      severity: "high"
    },
    {
      id: 2,
      pointName: "Freezer #2",
      recordedTemp: 12.3,
      allowedRange: "-10.0°F - 10.0°F",
      recordedAt: "2025-06-20 08:45",
      recordedBy: "Lisa Chen",
      status: "open",
      severity: "medium"
    },
    {
      id: 3,
      pointName: "Dairy Cooler #1",
      recordedTemp: 42.1,
      allowedRange: "36.0°F - 40.0°F",
      recordedAt: "2025-06-19 16:30",
      recordedBy: "Mike Johnson",
      status: "resolved",
      severity: "medium"
    }
  ]

  // Filter monitoring points based on search term and department
  const filteredMonitoringPoints = monitoringPoints.filter(point => {
    const matchesSearch = searchTerm === '' || 
      point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      point.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      point.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  // Filter violations based on search term
  const filteredViolations = violations.filter(violation => 
    searchTerm === '' || 
    violation.pointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    violation.recordedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get all unique departments for filter dropdown
  const departments = ['all', ...new Set(monitoringPoints.map(point => point.department))];

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
                  <Thermometer className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Temperature Monitoring</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Monitor and maintain safe temperatures for all food storage and display areas
                  </p>
                </div>
              </div>
              
              <motion.button
                className="px-5 py-2.5 bg-[#f7eccf] text-[#1C1C1C] rounded-full flex items-center gap-2 font-medium shadow-md"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <PlusCircle size={18} />
                <span>Add New Point</span>
              </motion.button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              {/* Tabs */}
              <div className="flex-col flex md:flex-row space-1 bg-[#f7eccf]/10 p-1 rounded-xl">
                {['monitoring', 'violations', 'checks'].map((tab) => (
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
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </motion.button>
                ))}
              </div>
              
              {/* Search bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search by name, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>
            
            {/* Department filter (only shown for monitoring tab) */}
            {activeTab === 'monitoring' && (
              <div className="flex items-center pt-4 border-t border-[#f7eccf]/10 mt-4">
                <div className="flex items-center gap-2 text-[#f7eccf]/70 mr-3">
                  <Filter size={16} />
                  <span className="text-sm">Filter by Department:</span>
                </div>
                <div className="w-64 relative">
                  <select 
                    value={departmentFilter} 
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                  >
                    {departments.map(dept => (
                      <option 
                        key={dept} 
                        value={dept} 
                        className="bg-[#1C1C1C]"
                      >
                        {dept === 'all' ? 'All Departments' : dept}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronRight size={14} className="rotate-90" />
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
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'monitoring' && (
          <motion.div
            key="monitoring"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredMonitoringPoints.length === 0 ? (
              <motion.div 
                variants={itemVariants}
                className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                  <Thermometer className="h-8 w-8 text-[#f7eccf]/50" />
                </div>
                <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No monitoring points found</h3>
                <p className="text-[#f7eccf]/70 max-w-md mx-auto">
                  No temperature monitoring points match your search criteria. Try adjusting your filters.
                </p>
              </motion.div>
            ) : (
              filteredMonitoringPoints.map(point => (
                <motion.div 
                  key={point.id} 
                  variants={cardVariants}
                  whileHover="hover"
                  className="relative"
                >
                  <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
                    <CardBody className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              point.status === 'normal' 
                                ? 'bg-green-500' 
                                : point.status === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}></span>
                            <h3 className="font-semibold text-lg text-[#f7eccf]">{point.name}</h3>
                            <span className="ml-2 px-3 py-1 text-xs font-medium rounded-full bg-[#f7eccf]/10 text-[#f7eccf]/80">
                              {point.department}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#f7eccf]/5 rounded-2xl p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-[#f7eccf]/70">Temperature Range</span>
                                <span className="text-sm font-medium text-[#f7eccf]">
                                  {point.minTemp}°F - {point.maxTemp}°F
                                </span>
                              </div>
                              
                              {/* Temperature visualization */}
                              <div className="relative h-8 bg-[#f7eccf]/10 rounded-full overflow-hidden mt-2">
                                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-red-500 w-full"></div>
                                <div className="absolute inset-y-0 flex items-center justify-center w-full">
                                  <div className="h-full w-[2px] bg-white/50 absolute" style={{ 
                                    left: `${(point.minTemp / (point.maxTemp * 1.2)) * 100}%` 
                                  }}></div>
                                  <div className="h-full w-[2px] bg-white/50 absolute" style={{ 
                                    left: `${(point.maxTemp / (point.maxTemp * 1.2)) * 100}%` 
                                  }}></div>
                                  <motion.div 
                                    className="h-full w-[3px] bg-white absolute"
                                    style={{ 
                                      left: `${(point.currentTemp / (point.maxTemp * 1.2)) * 100}%` 
                                    }}
                                    initial={{ height: 0 }}
                                    animate={{ height: '100%' }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                  ></motion.div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col justify-center bg-[#f7eccf]/5 rounded-2xl p-3">
                                <span className="text-xs text-[#f7eccf]/70 mb-1">Last Checked</span>
                                <div className="flex items-center">
                                  <Clock size={14} className="mr-1 text-[#f7eccf]/60" />
                                  <span className="text-sm text-[#f7eccf]">{point.lastChecked}</span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col justify-center bg-[#f7eccf]/5 rounded-2xl p-3">
                                <span className="text-xs text-[#f7eccf]/70 mb-1">Next Check</span>
                                <div className="flex items-center">
                                  <Calendar size={14} className="mr-1 text-[#f7eccf]/60" />
                                  <span className="text-sm text-[#f7eccf]">{point.nextCheck}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center">
                          <motion.div 
                            className={`text-3xl font-bold mb-2 ${
                              (point.currentTemp > point.maxTemp || point.currentTemp < point.minTemp)
                                ? 'text-red-500'
                                : (point.currentTemp > point.maxTemp - 2 || point.currentTemp < point.minTemp + 2)
                                ? 'text-amber-500'
                                : 'text-green-500'
                            }`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          >
                            {point.currentTemp}°F
                          </motion.div>
                          
                          <motion.button
                            className="bg-[#f7eccf] text-[#1C1C1C] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 shadow-md"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Log Temperature
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

        {activeTab === 'violations' && (
          <motion.div
            key="violations"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredViolations.length === 0 ? (
              <motion.div 
                variants={itemVariants}
                className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No violations found</h3>
                <p className="text-[#f7eccf]/70 max-w-md mx-auto">
                  All temperature readings are within acceptable ranges.
                </p>
              </motion.div>
            ) : (
              filteredViolations.map(violation => (
                <motion.div 
                  key={violation.id} 
                  variants={cardVariants}
                  whileHover="hover"
                  className="relative"
                >
                  <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
                    <CardBody className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-[#f7eccf]">{violation.pointName}</h3>
                            <div className="flex gap-2">
                              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                                violation.severity === 'high' 
                                  ? 'bg-red-500/20 text-red-500' 
                                  : violation.severity === 'medium'
                                  ? 'bg-amber-500/20 text-amber-500'
                                  : 'bg-green-500/20 text-green-500'
                              }`}>
                                {violation.severity.toUpperCase()}
                              </span>
                              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                                violation.status === 'resolved' 
                                  ? 'bg-green-500/20 text-green-500' 
                                  : 'bg-red-500/20 text-red-500'
                              }`}>
                                {violation.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-[#f7eccf]/5 rounded-2xl p-4 flex flex-col justify-center">
                              <span className="text-xs text-[#f7eccf]/70 mb-1">Recorded Temperature</span>
                              <span className="text-2xl font-bold text-red-500">
                                {violation.recordedTemp}°F
                              </span>
                              <span className="text-xs text-[#f7eccf]/70 mt-1">
                                Allowed: {violation.allowedRange}
                              </span>
                            </div>
                            
                            <div className="bg-[#f7eccf]/5 rounded-2xl p-4 flex flex-col justify-center">
                              <span className="text-xs text-[#f7eccf]/70 mb-1">Recorded By</span>
                              <span className="text-sm font-medium text-[#f7eccf]">
                                {violation.recordedBy}
                              </span>
                              <div className="flex items-center mt-1">
                                <Clock size={12} className="mr-1 text-[#f7eccf]/60" />
                                <span className="text-xs text-[#f7eccf]/70">
                                  {violation.recordedAt}
                                </span>
                              </div>
                            </div>
                            
                            <div className="bg-[#f7eccf]/5 rounded-2xl p-4 flex flex-col justify-center md:items-end">
                              <motion.div 
                                className="flex gap-2 mt-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                              >
                                {violation.status !== 'resolved' && (
                                  <motion.button
                                    className="bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-md flex items-center gap-1"
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <CheckCircle size={14} />
                                    Resolve
                                  </motion.button>
                                )}
                                <motion.button
                                  className="bg-[#f7eccf] text-[#1C1C1C] px-3 py-1.5 rounded-full text-sm font-medium shadow-md"
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  View Details
                                </motion.button>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                            violation.severity === 'high' 
                              ? 'bg-red-500/20' 
                              : violation.severity === 'medium'
                              ? 'bg-amber-500/20'
                              : 'bg-green-500/20'
                          }`}>
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 260, 
                                damping: 20,
                                delay: 0.2
                              }}
                            >
                              <AlertTriangle 
                                size={32} 
                                className={`${
                                  violation.severity === 'high' 
                                    ? 'text-red-500' 
                                    : violation.severity === 'medium'
                                    ? 'text-amber-500'
                                    : 'text-green-500'
                                }`}
                              />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'checks' && (
          <motion.div
            key="checks"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
              <CardBody className="p-6">
                <h3 className="font-semibold text-xl mb-4 text-[#f7eccf] flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-[#f7eccf]/70" />
                  Upcoming Temperature Checks
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#f7eccf]/10">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                          Monitoring Point
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                          Last Check
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                          Next Check
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#f7eccf]/70 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f7eccf]/10">
                      {monitoringPoints.map((point, index) => (
                        <motion.tr 
                          key={point.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-[#f7eccf]/5 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]">
                            {point.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]">
                            {point.department}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]/80">
                            {point.lastChecked}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]/80">
                            {point.nextCheck}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block w-3 h-3 rounded-full ${
                              point.status === 'normal' 
                                ? 'bg-green-500' 
                                : point.status === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}></span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <motion.button 
                              className="text-[#f7eccf] hover:text-[#f7eccf]/80 text-sm flex items-center gap-1"
                              whileHover={{ x: 2 }}
                            >
                              Log Reading
                              <ChevronRight size={14} />
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Summary Card */}
      <motion.div 
        variants={itemVariants}
        className="mt-6"
      >
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#f7eccf] mb-3">Temperature Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {monitoringPoints.filter(p => p.status === 'normal').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Normal</div>
                  </div>
                  
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {monitoringPoints.filter(p => p.status === 'warning').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Warning</div>
                  </div>
                  
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {monitoringPoints.filter(p => p.status === 'danger').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Critical</div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#f7eccf] mb-3">Violation Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-[#f7eccf]">
                      {violations.length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Total</div>
                  </div>
                  
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {violations.filter(v => v.status === 'open').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Open</div>
                  </div>
                  
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {violations.filter(v => v.status === 'resolved').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Resolved</div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  )
}