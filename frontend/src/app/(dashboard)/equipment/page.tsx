// app/(dashboard)/equipment/page.tsx

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { 
  PencilRuler, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle,
  PenTool,
  Settings,
  Shield,
  Trash,
  Edit,
  X,
  Info
} from 'lucide-react'

// Components
import { Card, CardBody, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Hooks & Context
import { useAuth } from '@/contexts/AuthContext'

// Services
import equipmentService, { 
  Equipment, 
  EquipmentCreate, 
  EquipmentUpdate, 
  MaintenanceRecord, 
  MaintenanceCreate,
  RepairRequest,
  RepairCreate, 
  EquipmentParams
} from '@/services/equipment'
import { cn } from '@/lib/utils'

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

// Modal form interfaces
interface EquipmentFormData {
  equipment_name: string
  equipment_type: string
  equipment_id?: string
  department_id?: number | null
  location?: string
  purchase_date?: string
  warranty_expires?: string
  assigned_to?: number | null
  status: string
  last_maintenance?: string
  next_maintenance_due?: string
  notes?: string
}

interface MaintenanceFormData {
  equipment_id: number
  maintenance_type: string
  description?: string
  scheduled_date: string
  performed_by?: number
  status: string
  notes?: string
}

interface RepairFormData {
  equipment_id: number
  issue_description: string
  reported_by: number
  urgency: string
  notes?: string
}

// Lookup tables for readability
const STATUS_LABELS: Record<string, string> = {
  'operational': 'Operational',
  'needs_maintenance': 'Needs Maintenance',
  'needs_repair': 'Needs Repair',
  'out_of_service': 'Out of Service',
  'pending': 'Pending',
  'scheduled': 'Scheduled',
  'in_progress': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'assigned': 'Assigned'
}

const EQUIPMENT_TYPES = [
  'Food Preparation',
  'Refrigeration',
  'Heating',
  'Display',
  'Storage',
  'Measurement',
  'Packaging',
  'Cleaning',
  'Safety',
  'IT',
  'Office',
  'Transportation',
  'Other'
]

const MAINTENANCE_TYPES = [
  'Regular Maintenance',
  'Deep Cleaning',
  'Calibration',
  'Inspection',
  'Software Update',
  'Hardware Replacement',
  'Other'
]

const URGENCY_LEVELS = [
  'low',
  'medium',
  'high',
  'critical'
]

export default function EquipmentPage() {
  // Auth context
  const { user, isAdmin, isManager } = useAuth()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('equipment')
  
  // Data states
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([])
  
  // UI states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('equipment_name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  
  // Modal states
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [currentEquipment, setCurrentEquipment] = useState<Equipment | null>(null)
  const [currentMaintenance, setCurrentMaintenance] = useState<MaintenanceRecord | null>(null)
  const [currentRepair, setCurrentRepair] = useState<RepairRequest | null>(null)
  
  // Form states
  const [equipmentForm, setEquipmentForm] = useState<EquipmentFormData>({
    equipment_name: '',
    equipment_type: EQUIPMENT_TYPES[0],
    status: 'operational'
  })
  
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormData>({
    equipment_id: 0,
    maintenance_type: MAINTENANCE_TYPES[0],
    scheduled_date: new Date().toISOString().substring(0, 10),
    status: 'scheduled'
  })
  
  const [repairForm, setRepairForm] = useState<RepairFormData>({
    equipment_id: 0,
    issue_description: '',
    reported_by: user?.employee_id || 0,
    urgency: 'medium'
  })

  // Fetch data
  const fetchEquipment = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = {
        sort: sortBy,
        order: sortOrder,
        status: statusFilter,
        search: searchTerm.length > 0 ? searchTerm : undefined
      }
      const data = await equipmentService.getEquipment(params as EquipmentParams, user)
      setEquipment(data.items || data)
      setError(null)
    } catch (err: any) {
      setError(`Failed to load equipment: ${err.message}`)
      console.error('Error loading equipment:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sortBy, sortOrder, statusFilter, searchTerm, user])

  const fetchMaintenanceRecords = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = {
        sort: 'scheduled_date',
        order: 'asc'
      }
      const data = await equipmentService.getMaintenanceRecords(params)
      setMaintenanceRecords(data.items || data)
      setError(null)
    } catch (err: any) {
      setError(`Failed to load maintenance records: ${err.message}`)
      console.error('Error loading maintenance records:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchRepairRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = {
        sort: 'reported_date',
        order: 'desc'
      }
      const data = await equipmentService.getRepairRequests(params)
      setRepairRequests(data.items || data)
      setError(null)
    } catch (err: any) {
      setError(`Failed to load repair requests: ${err.message}`)
      console.error('Error loading repair requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (activeTab === 'equipment') {
      fetchEquipment()
    } else if (activeTab === 'maintenance') {
      fetchMaintenanceRecords()
    } else if (activeTab === 'repairs') {
      fetchRepairRequests()
    }
  }, [activeTab, fetchEquipment, fetchMaintenanceRecords, fetchRepairRequests])

  // CRUD operations
  const handleCreateEquipment = async () => {
    try {
      setIsLoading(true)
      const newEquipment = await equipmentService.createEquipment(equipmentForm)
      setEquipment(prev => [...prev, newEquipment])
      setShowEquipmentModal(false)
      setEquipmentForm({
        equipment_name: '',
        equipment_type: EQUIPMENT_TYPES[0],
        status: 'operational'
      })
    } catch (err: any) {
      setError(`Failed to create equipment: ${err.message}`)
      console.error('Error creating equipment:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateEquipment = async () => {
    if (!currentEquipment) return
    
    try {
      setIsLoading(true)
      const updatedEquipment = await equipmentService.updateEquipment(
        currentEquipment.id, 
        equipmentForm
      )
      setEquipment(prev => 
        prev.map(item => item.id === updatedEquipment.id ? updatedEquipment : item)
      )
      setShowEquipmentModal(false)
      setCurrentEquipment(null)
    } catch (err: any) {
      setError(`Failed to update equipment: ${err.message}`)
      console.error('Error updating equipment:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEquipment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return
    
    try {
      setIsLoading(true)
      await equipmentService.deleteEquipment(id)
      setEquipment(prev => prev.filter(item => item.id !== id))
    } catch (err: any) {
      setError(`Failed to delete equipment: ${err.message}`)
      console.error('Error deleting equipment:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMaintenance = async () => {
    try {
      setIsLoading(true)
      const newMaintenance = await equipmentService.createMaintenanceRecord(maintenanceForm)
      setMaintenanceRecords(prev => [...prev, newMaintenance])
      setShowMaintenanceModal(false)
      setMaintenanceForm({
        equipment_id: 0,
        maintenance_type: MAINTENANCE_TYPES[0],
        scheduled_date: new Date().toISOString().substring(0, 10),
        status: 'scheduled'
      })
    } catch (err: any) {
      setError(`Failed to schedule maintenance: ${err.message}`)
      console.error('Error scheduling maintenance:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateMaintenanceStatus = async (id: number, status: string) => {
    try {
      setIsLoading(true)
      const updatedMaintenance = await equipmentService.updateMaintenanceStatus(id, status)
      setMaintenanceRecords(prev => 
        prev.map(item => item.id === updatedMaintenance.id ? updatedMaintenance : item)
      )
    } catch (err: any) {
      setError(`Failed to update maintenance status: ${err.message}`)
      console.error('Error updating maintenance status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRepair = async () => {
    try {
      setIsLoading(true)
      const newRepair = await equipmentService.createRepairRequest(repairForm)
      setRepairRequests(prev => [...prev, newRepair])
      setShowRepairModal(false)
      setRepairForm({
        equipment_id: 0,
        issue_description: '',
        reported_by: user?.employee_id || 0,
        urgency: 'medium'
      })
    } catch (err: any) {
      setError(`Failed to report issue: ${err.message}`)
      console.error('Error reporting issue:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRepairStatus = async (id: number, status: string) => {
    try {
      setIsLoading(true)
      const updatedRepair = await equipmentService.updateRepairStatus(id, status)
      setRepairRequests(prev => 
        prev.map(item => item.id === updatedRepair.id ? updatedRepair : item)
      )
    } catch (err: any) {
      setError(`Failed to update repair status: ${err.message}`)
      console.error('Error updating repair status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // UI helpers
  const openEquipmentModal = (equipment?: Equipment) => {
    if (equipment) {
      setCurrentEquipment(equipment)
      setEquipmentForm({
        equipment_name: equipment.equipment_name,
        equipment_type: equipment.equipment_type,
        equipment_id: equipment.equipment_id,
        department_id: equipment.department_id,
        location: equipment.location,
        purchase_date: equipment.purchase_date,
        warranty_expires: equipment.warranty_expires,
        assigned_to: equipment.assigned_to,
        status: equipment.status,
        last_maintenance: equipment.last_maintenance,
        next_maintenance_due: equipment.next_maintenance_due,
        notes: equipment.notes
      })
    } else {
      setCurrentEquipment(null)
      setEquipmentForm({
        equipment_name: '',
        equipment_type: EQUIPMENT_TYPES[0],
        status: 'operational'
      })
    }
    setShowEquipmentModal(true)
  }

  const openMaintenanceModal = (equipment?: Equipment) => {
    setMaintenanceForm({
      equipment_id: equipment?.id || 0,
      maintenance_type: MAINTENANCE_TYPES[0],
      scheduled_date: new Date().toISOString().substring(0, 10),
      status: 'scheduled'
    })
    setShowMaintenanceModal(true)
  }

  const openRepairModal = (equipment?: Equipment) => {
    setRepairForm({
      equipment_id: equipment?.id || 0,
      issue_description: '',
      reported_by: user?.employee_id || 0,
      urgency: 'medium'
    })
    setShowRepairModal(true)
  }

  const getStatusStyle = (status: string): string => {
    switch(status) {
      case 'operational':
        return 'bg-green-500/10 text-green-500';
      case 'needs_maintenance':
        return 'bg-amber-500/10 text-amber-500';
      case 'needs_repair':
        return 'bg-red-500/10 text-red-500';
      case 'out_of_service':
        return 'bg-gray-500/10 text-gray-500';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-500';
      case 'in_progress':
        return 'bg-purple-500/10 text-purple-500';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'cancelled':
        return 'bg-gray-500/10 text-gray-500';
      case 'pending':
        return 'bg-amber-500/10 text-amber-500';
      case 'assigned':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getUrgencyStyle = (urgency: string): string => {
    switch(urgency) {
      case 'low':
        return 'bg-green-500/10 text-green-500';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500';
      case 'high':
        return 'bg-red-500/10 text-red-500';
      case 'critical':
        return 'bg-red-700/10 text-red-700';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  // Get status counts for summary
  const operationalCount = equipment.filter(item => item.status === 'operational').length
  const needsMaintenanceCount = equipment.filter(item => item.status === 'needs_maintenance').length
  const needsRepairCount = equipment.filter(item => item.status === 'needs_repair').length
  const outOfServiceCount = equipment.filter(item => item.status === 'out_of_service').length
  
  // Render loading state
  if (isLoading && equipment.length === 0 && maintenanceRecords.length === 0 && repairRequests.length === 0) {
    return <LoadingSpinner text="Loading equipment data..." />
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Error Alert */}
      {error && (
        <motion.div 
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-2 bg-red-500/20 rounded-full">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-500/10 rounded-full"
          >
            <X className="h-5 w-5 text-red-500" />
          </button>
        </motion.div>
      )}

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
              
              {(isAdmin || isManager) && (
                <div className="flex gap-3">
                  <motion.button
                    className="px-4 py-2.5 bg-[#1C1C1C] border border-[#f7eccf]/30 text-[#f7eccf] rounded-full flex items-center gap-2 font-medium shadow-md"
                    whileHover={{ scale: 1.05, y: -2, backgroundColor: 'rgba(247, 236, 207, 0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openEquipmentModal()}
                  >
                    <Plus size={18} />
                    <span>New Equipment</span>
                  </motion.button>
                  
                  <motion.button
                    className="px-4 py-2.5 bg-[#f7eccf] text-[#1C1C1C] rounded-full flex items-center gap-2 font-medium shadow-md"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (equipment.length > 0) {
                        openRepairModal(equipment[0])
                      } else {
                        setShowRepairModal(true)
                      }
                    }}
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
                  onSearch={(term) => setSearchTerm(term)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>
            
            {/* Sort & filters */}
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
                  {activeTab === 'equipment' && (
                    <>
                      <option value="equipment_name" className="bg-[#1C1C1C]">Name</option>
                      <option value="department_id" className="bg-[#1C1C1C]">Department</option>
                      <option value="status" className="bg-[#1C1C1C]">Status</option>
                      <option value="next_maintenance_due" className="bg-[#1C1C1C]">Maintenance Date</option>
                    </>
                  )}
                  {activeTab === 'maintenance' && (
                    <>
                      <option value="scheduled_date" className="bg-[#1C1C1C]">Scheduled Date</option>
                      <option value="maintenance_type" className="bg-[#1C1C1C]">Type</option>
                      <option value="status" className="bg-[#1C1C1C]">Status</option>
                    </>
                  )}
                  {activeTab === 'repairs' && (
                    <>
                      <option value="reported_date" className="bg-[#1C1C1C]">Reported Date</option>
                      <option value="urgency" className="bg-[#1C1C1C]">Urgency</option>
                      <option value="status" className="bg-[#1C1C1C]">Status</option>
                    </>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                  <ChevronDown size={14} />
                </div>
              </div>

              <div className="w-48 relative ml-2">
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                >
                  <option value="asc" className="bg-[#1C1C1C]">Ascending</option>
                  <option value="desc" className="bg-[#1C1C1C]">Descending</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                  <ChevronDown size={14} />
                </div>
              </div>

              {activeTab === 'equipment' && (
                <div className="w-48 relative ml-2">
                  <select 
                    value={statusFilter || ''}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                  >
                    <option value="" className="bg-[#1C1C1C]">All Statuses</option>
                    <option value="operational" className="bg-[#1C1C1C]">Operational</option>
                    <option value="needs_maintenance" className="bg-[#1C1C1C]">Needs Maintenance</option>
                    <option value="needs_repair" className="bg-[#1C1C1C]">Needs Repair</option>
                    <option value="out_of_service" className="bg-[#1C1C1C]">Out of Service</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#f7eccf]/50">
                    <ChevronDown size={14} />
                  </div>
                </div>
              )}
              
              <motion.button
                className="ml-3 p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                onClick={() => {
                  if (activeTab === 'equipment') {
                    fetchEquipment()
                  } else if (activeTab === 'maintenance') {
                    fetchMaintenanceRecords()
                  } else if (activeTab === 'repairs') {
                    fetchRepairRequests()
                  }
                }}
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
                {isLoading && equipment.length === 0 ? (
                  <div className="py-20 flex justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-4 border-[#f7eccf]/20 border-t-[#f7eccf] animate-spin mb-4"></div>
                      <p className="text-[#f7eccf]/70">Loading equipment data...</p>
                    </div>
                  </div>
                ) : equipment.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                      <Settings className="h-8 w-8 text-[#f7eccf]/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No equipment found</h3>
                    <p className="text-[#f7eccf]/70 max-w-md text-center">
                      {searchTerm 
                        ? 'Try adjusting your search criteria or filters.'
                        : 'Add new equipment to your inventory.'}
                    </p>
                    {(isAdmin || isManager) && !searchTerm && (
                      <motion.button
                        className="mt-4 px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] rounded-xl flex items-center gap-2 font-medium"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openEquipmentModal()}
                      >
                        <Plus size={18} />
                        <span>Add Equipment</span>
                      </motion.button>
                    )}
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
                        {equipment.map((item, index) => (
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
                                <span className="font-medium text-[#f7eccf]">{item.equipment_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">{item.equipment_type}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">{item.location || '-'}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusStyle(item.status)}`}>
                                {STATUS_LABELS[item.status] || item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">
                              <span className="px-3 py-1 rounded-full bg-[#f7eccf]/5 text-[#f7eccf]">
                                {item.department_id || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-[#f7eccf]/80">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                {item.next_maintenance_due || 'Not scheduled'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                <motion.button 
                                  className="px-3 py-1 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] text-sm hover:bg-[#f7eccf]/20 transition-colors"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ y: 0 }}
                                  onClick={() => openEquipmentModal(item)}
                                >
                                  Details
                                </motion.button>
                                <motion.button 
                                  className="px-3 py-1 rounded-lg bg-[#f7eccf]/10 text-[#f7eccf] text-sm hover:bg-[#f7eccf]/20 transition-colors"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ y: 0 }}
                                  onClick={() => openMaintenanceModal(item)}
                                >
                                  Maintenance
                                </motion.button>
                                {(isAdmin || isManager) && (
                                  <motion.button 
                                    className="p-1 rounded-lg bg-red-500/10 text-red-500 text-sm hover:bg-red-500/20 transition-colors"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ y: 0 }}
                                    onClick={() => handleDeleteEquipment(item.id)}
                                  >
                                    <Trash size={16} />
                                  </motion.button>
                                )}
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
            {isLoading && repairRequests.length === 0 ? (
              <div className="py-20 flex justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-4 border-[#f7eccf]/20 border-t-[#f7eccf] animate-spin mb-4"></div>
                  <p className="text-[#f7eccf]/70">Loading repair requests...</p>
                </div>
              </div>
            ) : repairRequests.length === 0 ? (
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
                    {equipment.length > 0 && (
                      <motion.button
                        className="mt-4 px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] rounded-xl flex items-center gap-2 font-medium"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openRepairModal(equipment[0])}
                      >
                        <AlertCircle size={18} />
                        <span>Report Issue</span>
                      </motion.button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ) : (
              repairRequests.map((request, index) => (
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
                            <h3 className="font-semibold text-lg text-[#f7eccf]">
                              {request.equipment_name || `Equipment #${request.equipment_id}`}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getUrgencyStyle(request.urgency)}`}>
                                {request.urgency.toUpperCase()} PRIORITY
                              </span>
                              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(request.status)}`}>
                                {STATUS_LABELS[request.status] || request.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-[#f7eccf]/5 mb-4">
                            <p className="text-sm text-[#f7eccf]/90">{request.issue_description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                              <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                                <Calendar size={14} className="text-[#f7eccf]/70" />
                              </div>
                              Reported: {new Date(request.reported_date).toLocaleDateString()}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-[#f7eccf]/70">
                              <div className="h-8 w-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                                <Shield size={14} className="text-[#f7eccf]/70" />
                              </div>
                              Reported by: {request.reported_by_name || `User #${request.reported_by}`}
                            </div>
                          </div>
                          
                          {request.assigned_to && (
                            <div className="mt-4 p-3 rounded-xl bg-[#f7eccf]/5 inline-flex items-center">
                              <span className="text-sm text-[#f7eccf]/70 mr-2">Assigned to:</span>
                              <span className="text-sm font-medium text-[#f7eccf]">
                                {request.assigned_to_name || `Employee #${request.assigned_to}`}
                              </span>
                            </div>
                          )}
                          
                          {request.resolution && (
                            <div className="mt-4 p-3 rounded-xl bg-[#f7eccf]/5">
                              <span className="text-sm text-[#f7eccf]/70 block mb-1">Resolution:</span>
                              <span className="text-sm text-[#f7eccf]">{request.resolution}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                          {(isAdmin || isManager) && request.status !== 'completed' && (
                            <div className="w-full md:w-auto">
                              <select 
                                value={request.status}
                                onChange={(e) => handleUpdateRepairStatus(request.id, e.target.value)}
                                className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all text-sm"
                              >
                                <option value="pending" className="bg-[#1C1C1C]">Pending</option>
                                <option value="assigned" className="bg-[#1C1C1C]">Assigned</option>
                                <option value="in_progress" className="bg-[#1C1C1C]">In Progress</option>
                                <option value="completed" className="bg-[#1C1C1C]">Completed</option>
                                <option value="cancelled" className="bg-[#1C1C1C]">Cancelled</option>
                              </select>
                            </div>
                          )}
                          
                          
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
                  Maintenance Schedule
                </h3>
                
                {isLoading && maintenanceRecords.length === 0 ? (
                  <div className="py-20 flex justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-4 border-[#f7eccf]/20 border-t-[#f7eccf] animate-spin mb-4"></div>
                      <p className="text-[#f7eccf]/70">Loading maintenance schedule...</p>
                    </div>
                  </div>
                ) : maintenanceRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-[#f7eccf]/5 rounded-2xl">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No maintenance scheduled</h3>
                    <p className="text-[#f7eccf]/70 max-w-md text-center">
                      There are no upcoming maintenance tasks scheduled.
                    </p>
                    {equipment.length > 0 && (isAdmin || isManager) && (
                      <motion.button
                        className="mt-4 px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] rounded-xl flex items-center gap-2 font-medium"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openMaintenanceModal(equipment[0])}
                      >
                        <Plus size={18} />
                        <span>Schedule Maintenance</span>
                      </motion.button>
                    )}
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
                            Performed By
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
                        {maintenanceRecords.map((item, index) => (
                          <motion.tr 
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-[#f7eccf]/5 transition-colors group"
                          >
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[#f7eccf]">
                              {item.equipment_name || `Equipment #${item.equipment_id}`}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">
                              <span className="px-3 py-1 rounded-full bg-[#f7eccf]/5 text-[#f7eccf]">
                                {item.maintenance_type}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-[#f7eccf]/80">
                                <Calendar size={14} className="mr-2 text-[#f7eccf]/50" />
                                {new Date(item.scheduled_date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">
                              {item.performed_by_name || (item.performed_by ? `Employee #${item.performed_by}` : '-')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusStyle(item.status)}`}>
                                {STATUS_LABELS[item.status] || item.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#f7eccf]/80">
                              {item.description ? (
                                <div className="flex items-center">
                                  <Info size={14} className="mr-1 text-[#f7eccf]/50" />
                                  <span className="truncate max-w-[150px]">{item.description}</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {(isAdmin || isManager) && item.status !== 'completed' && (
                                <div className="w-32">
                                  <select 
                                    value={item.status}
                                    onChange={(e) => handleUpdateMaintenanceStatus(item.id, e.target.value)}
                                    className="w-full p-1 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-lg text-[#f7eccf] text-xs focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                                  >
                                    <option value="scheduled" className="bg-[#1C1C1C]">Scheduled</option>
                                    <option value="in_progress" className="bg-[#1C1C1C]">In Progress</option>
                                    <option value="completed" className="bg-[#1C1C1C]">Completed</option>
                                    <option value="cancelled" className="bg-[#1C1C1C]">Cancelled</option>
                                  </select>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {(isAdmin || isManager) && equipment.length > 0 && (
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
                      onClick={() => openMaintenanceModal(equipment[0])}
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
                <p className="text-2xl font-bold text-[#f7eccf]">{equipment.length}</p>
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
                <p className="text-2xl font-bold text-green-500">{operationalCount}</p>
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
                <p className="text-2xl font-bold text-amber-500">{needsMaintenanceCount}</p>
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
                <p className="text-2xl font-bold text-red-500">{needsRepairCount}</p>
              </motion.div>
            </div>
            
            {equipment.length > 0 && (
              <>
                <div className="mt-6 h-3 bg-[#f7eccf]/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(operationalCount / equipment.length) * 100}%` 
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="mt-2 text-xs text-[#f7eccf]/70 text-right">
                  {Math.round((operationalCount / equipment.length) * 100)}% operational
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-[#1C1C1C] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            <div className="p-6 bg-[#f7eccf]/5 flex justify-between items-center border-b border-[#f7eccf]/10">
              <h2 className="text-xl font-semibold text-[#f7eccf]">
                {currentEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </h2>
              <button 
                onClick={() => setShowEquipmentModal(false)}
                className="p-2 hover:bg-[#f7eccf]/10 rounded-full text-[#f7eccf]/70 hover:text-[#f7eccf]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Name</label>
                  <input 
                    type="text"
                    value={equipmentForm.equipment_name}
                    onChange={(e) => setEquipmentForm({...equipmentForm, equipment_name: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Type</label>
                  <select 
                    value={equipmentForm.equipment_type}
                    onChange={(e) => setEquipmentForm({...equipmentForm, equipment_type: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    {EQUIPMENT_TYPES.map(type => (
                      <option key={type} value={type} className="bg-[#1C1C1C]">{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">ID/Serial Number</label>
                  <input 
                    type="text"
                    value={equipmentForm.equipment_id || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, equipment_id: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Department ID</label>
                  <input 
                    type="number"
                    value={equipmentForm.department_id || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, department_id: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Location</label>
                  <input 
                    type="text"
                    value={equipmentForm.location || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, location: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Status</label>
                  <select 
                    value={equipmentForm.status}
                    onChange={(e) => setEquipmentForm({...equipmentForm, status: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    <option value="operational" className="bg-[#1C1C1C]">Operational</option>
                    <option value="needs_maintenance" className="bg-[#1C1C1C]">Needs Maintenance</option>
                    <option value="needs_repair" className="bg-[#1C1C1C]">Needs Repair</option>
                    <option value="out_of_service" className="bg-[#1C1C1C]">Out of Service</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Purchase Date</label>
                  <input 
                    type="date"
                    value={equipmentForm.purchase_date || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, purchase_date: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Warranty Expires</label>
                  <input 
                    type="date"
                    value={equipmentForm.warranty_expires || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, warranty_expires: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Assigned To (Employee ID)</label>
                  <input 
                    type="number"
                    value={equipmentForm.assigned_to || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, assigned_to: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Last Maintenance</label>
                  <input 
                    type="date"
                    value={equipmentForm.last_maintenance || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, last_maintenance: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Next Maintenance Due</label>
                  <input 
                    type="date"
                    value={equipmentForm.next_maintenance_due || ''}
                    onChange={(e) => setEquipmentForm({...equipmentForm, next_maintenance_due: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Notes</label>
                <textarea 
                  value={equipmentForm.notes || ''}
                  onChange={(e) => setEquipmentForm({...equipmentForm, notes: e.target.value})}
                  className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  className="px-4 py-2 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium border border-[#f7eccf]/20"
                  whileHover={{ y: -2, backgroundColor: 'rgba(247, 236, 207, 0.2)' }}
                  whileTap={{ y: 0 }}
                  onClick={() => setShowEquipmentModal(false)}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="px-4 py-2 rounded-xl bg-[#f7eccf] text-[#1C1C1C] font-medium"
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={currentEquipment ? handleUpdateEquipment : handleCreateEquipment}
                  disabled={!equipmentForm.equipment_name || !equipmentForm.equipment_type}
                >
                  {currentEquipment ? 'Update Equipment' : 'Add Equipment'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-[#1C1C1C] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            <div className="p-6 bg-[#f7eccf]/5 flex justify-between items-center border-b border-[#f7eccf]/10">
              <h2 className="text-xl font-semibold text-[#f7eccf]">Schedule Maintenance</h2>
              <button 
                onClick={() => setShowMaintenanceModal(false)}
                className="p-2 hover:bg-[#f7eccf]/10 rounded-full text-[#f7eccf]/70 hover:text-[#f7eccf]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Equipment</label>
                  <select 
                    value={maintenanceForm.equipment_id}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, equipment_id: parseInt(e.target.value)})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    <option value="" className="bg-[#1C1C1C]">Select Equipment</option>
                    {equipment.map(item => (
                      <option key={item.id} value={item.id} className="bg-[#1C1C1C]">
                        {item.equipment_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Maintenance Type</label>
                  <select 
                    value={maintenanceForm.maintenance_type}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, maintenance_type: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    {MAINTENANCE_TYPES.map(type => (
                      <option key={type} value={type} className="bg-[#1C1C1C]">{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Scheduled Date</label>
                  <input 
                    type="date"
                    value={maintenanceForm.scheduled_date}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, scheduled_date: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Assigned To (Employee ID)</label>
                  <input 
                    type="number"
                    value={maintenanceForm.performed_by || ''}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, performed_by: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Status</label>
                  <select 
                    value={maintenanceForm.status}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, status: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    <option value="scheduled" className="bg-[#1C1C1C]">Scheduled</option>
                    <option value="in_progress" className="bg-[#1C1C1C]">In Progress</option>
                    <option value="completed" className="bg-[#1C1C1C]">Completed</option>
                    <option value="cancelled" className="bg-[#1C1C1C]">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Description</label>
                  <textarea 
                    value={maintenanceForm.description || ''}
                    onChange={(e) => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  className="px-4 py-2 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium border border-[#f7eccf]/20"
                  whileHover={{ y: -2, backgroundColor: 'rgba(247, 236, 207, 0.2)' }}
                  whileTap={{ y: 0 }}
                  onClick={() => setShowMaintenanceModal(false)}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="px-4 py-2 rounded-xl bg-[#f7eccf] text-[#1C1C1C] font-medium"
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={handleCreateMaintenance}
                  disabled={!maintenanceForm.equipment_id || !maintenanceForm.scheduled_date}
                >
                  Schedule Maintenance
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Repair Modal */}
      {showRepairModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-[#1C1C1C] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            <div className="p-6 bg-[#f7eccf]/5 flex justify-between items-center border-b border-[#f7eccf]/10">
              <h2 className="text-xl font-semibold text-[#f7eccf]">Report Equipment Issue</h2>
              <button 
                onClick={() => setShowRepairModal(false)}
                className="p-2 hover:bg-[#f7eccf]/10 rounded-full text-[#f7eccf]/70 hover:text-[#f7eccf]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Equipment</label>
                  <select 
                    value={repairForm.equipment_id}
                    onChange={(e) => setRepairForm({...repairForm, equipment_id: parseInt(e.target.value)})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    <option value="" className="bg-[#1C1C1C]">Select Equipment</option>
                    {equipment.map(item => (
                      <option key={item.id} value={item.id} className="bg-[#1C1C1C]">
                        {item.equipment_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Issue Description</label>
                  <textarea 
                    value={repairForm.issue_description}
                    onChange={(e) => setRepairForm({...repairForm, issue_description: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    rows={4}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Urgency</label>
                  <select 
                    value={repairForm.urgency}
                    onChange={(e) => setRepairForm({...repairForm, urgency: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    required
                  >
                    <option value="low" className="bg-[#1C1C1C]">Low</option>
                    <option value="medium" className="bg-[#1C1C1C]">Medium</option>
                    <option value="high" className="bg-[#1C1C1C]">High</option>
                    <option value="critical" className="bg-[#1C1C1C]">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#f7eccf]/70 mb-1">Notes</label>
                  <textarea 
                    value={repairForm.notes || ''}
                    onChange={(e) => setRepairForm({...repairForm, notes: e.target.value})}
                    className="w-full p-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent appearance-none transition-all"
                    rows={2}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  className="px-4 py-2 rounded-xl bg-[#f7eccf]/10 text-[#f7eccf] font-medium border border-[#f7eccf]/20"
                  whileHover={{ y: -2, backgroundColor: 'rgba(247, 236, 207, 0.2)' }}
                  whileTap={{ y: 0 }}
                  onClick={() => setShowRepairModal(false)}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="px-4 py-2 rounded-xl bg-[#f7eccf] text-[#1C1C1C] font-medium"
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={handleCreateRepair}
                  disabled={!repairForm.equipment_id || !repairForm.issue_description}
                >
                  Report Issue
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}