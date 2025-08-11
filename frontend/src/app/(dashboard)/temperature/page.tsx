// app/(dashboard)/temperature/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAuth } from '@/contexts/AuthContext'
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
  PlusCircle,
  Loader,
  X,
  Info
} from 'lucide-react'

// Import our temperature service
import temperatureService, {
  TempMonitoringPoint,
  TempMonitoringPointCreate,
  TempLog,
  TempLogCreate,
  TempViolation,
  DueCheck
} from '@/services/temperature'

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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Custom Modal Component
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling

      // Focus trap
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // Restore scrolling
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-30 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={modalRef}
        className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-[#1C1C1C] rounded-3xl shadow-xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()} // Prevent clicks from propagating
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-6 text-[#f7eccf]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-[#f7eccf]/70 hover:text-[#f7eccf] focus:outline-none"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
};

// Modal for adding/editing monitoring points
function MonitoringPointModal({ 
  isOpen, 
  onClose, 
  onSave, 
  point 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: TempMonitoringPointCreate) => void; 
  point?: TempMonitoringPoint;
}) {
  const [formData, setFormData] = useState<TempMonitoringPointCreate>({
    equipment_type: '',
    department_id: null,
    min_temp_fahrenheit: 32,
    max_temp_fahrenheit: 40,
    check_frequency_hours: 4,
    is_active: true,
    equipment_id: null
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (point) {
        setFormData({
          equipment_type: point.equipment_type,
          department_id: point.department_id,
          min_temp_fahrenheit: point.min_temp_fahrenheit,
          max_temp_fahrenheit: point.max_temp_fahrenheit,
          check_frequency_hours: point.check_frequency_hours,
          is_active: point.is_active,
          equipment_id: point.equipment_id
        });
      } else {
        setFormData({
          equipment_type: '',
          department_id: null,
          min_temp_fahrenheit: 32,
          max_temp_fahrenheit: 40,
          check_frequency_hours: 4,
          is_active: true,
          equipment_id: null
        });
      }
    }
  }, [isOpen, point]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={point ? 'Edit Monitoring Point' : 'Add New Monitoring Point'}
        >
          <div className="mt-2">
            <p className="text-sm text-[#f7eccf]/70">
              {point ? 'Update the details for this monitoring point.' : 'Create a new temperature monitoring point.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="equipment_type" className="block text-sm font-medium text-[#f7eccf]/90">
                Equipment Type*
              </label>
              <input
                type="text"
                name="equipment_type"
                id="equipment_type"
                required
                value={formData.equipment_type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
              />
            </div>

            <div>
              <label htmlFor="department_id" className="block text-sm font-medium text-[#f7eccf]/90">
                Department ID
              </label>
              <input
                type="number"
                name="department_id"
                id="department_id"
                value={formData.department_id || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="min_temp_fahrenheit" className="block text-sm font-medium text-[#f7eccf]/90">
                  Min Temp (°F)*
                </label>
                <input
                  type="number"
                  name="min_temp_fahrenheit"
                  id="min_temp_fahrenheit"
                  required
                  step="0.1"
                  value={formData.min_temp_fahrenheit}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
                />
              </div>
              <div>
                <label htmlFor="max_temp_fahrenheit" className="block text-sm font-medium text-[#f7eccf]/90">
                  Max Temp (°F)*
                </label>
                <input
                  type="number"
                  name="max_temp_fahrenheit"
                  id="max_temp_fahrenheit"
                  required
                  step="0.1"
                  value={formData.max_temp_fahrenheit}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
                />
              </div>
            </div>

            <div>
              <label htmlFor="check_frequency_hours" className="block text-sm font-medium text-[#f7eccf]/90">
                Check Frequency (hours)
              </label>
              <input
                type="number"
                name="check_frequency_hours"
                id="check_frequency_hours"
                value={formData.check_frequency_hours}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
              />
            </div>

            <div>
              <label htmlFor="equipment_id" className="block text-sm font-medium text-[#f7eccf]/90">
                Equipment ID
              </label>
              <input
                type="number"
                name="equipment_id"
                id="equipment_id"
                value={formData.equipment_id || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded text-[#f7eccf] focus:ring-[#f7eccf]"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-[#f7eccf]/90">
                Active
              </label>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] rounded-full text-sm hover:bg-[#f7eccf]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#f7eccf]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] rounded-full text-sm font-medium hover:bg-[#f7eccf]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#f7eccf]"
              >
                {point ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AnimatePresence>
  );
}

// Modal for logging temperature
function TemperatureLogModal({
  isOpen,
  onClose,
  onSave,
  monitoringPoint
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TempLogCreate) => void;
  monitoringPoint: TempMonitoringPoint | null;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TempLogCreate>({
    monitoring_point_id: monitoringPoint?.id || 0,
    recorded_temp_fahrenheit: 0,
    recorded_by: user?.employee_id || 0,
    notes: '',
    shift: 'morning',
  });
  
  const [isWithinRange, setIsWithinRange] = useState(false);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && monitoringPoint && user) {
      // Set default temperature to the midpoint of the allowed range
      const defaultTemp = (monitoringPoint.min_temp_fahrenheit + monitoringPoint.max_temp_fahrenheit) / 2;
      
      setFormData({
        monitoring_point_id: monitoringPoint.id,
        recorded_temp_fahrenheit: parseFloat(defaultTemp.toFixed(1)),
        recorded_by: user.employee_id || 0,
        notes: '',
        shift: getCurrentShift(),
      });
      
      // Check if default temp is within range
      setIsWithinRange(
        defaultTemp >= monitoringPoint.min_temp_fahrenheit && 
        defaultTemp <= monitoringPoint.max_temp_fahrenheit
      );
    }
  }, [isOpen, monitoringPoint, user]);
  
  // Get current shift based on time of day
  const getCurrentShift = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  };
  
  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const temp = parseFloat(e.target.value);
    setFormData(prev => ({ ...prev, recorded_temp_fahrenheit: temp }));
    
    if (monitoringPoint) {
      setIsWithinRange(
        temp >= monitoringPoint.min_temp_fahrenheit && 
        temp <= monitoringPoint.max_temp_fahrenheit
      );
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      is_within_range: isWithinRange,
    });
  };
  
  if (!monitoringPoint) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title="Log Temperature"
        >
          <div className="mt-2">
            <p className="text-sm text-[#f7eccf]/70">
              Recording temperature for: <span className="font-medium">{monitoringPoint.equipment_type}</span>
            </p>
            <p className="text-sm text-[#f7eccf]/70 mt-1">
              Acceptable range: <span className="font-medium">{monitoringPoint.min_temp_fahrenheit}°F - {monitoringPoint.max_temp_fahrenheit}°F</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="recorded_temp_fahrenheit" className="block text-sm font-medium text-[#f7eccf]/90">
                Temperature (°F)*
              </label>
              <div className="mt-1 relative">
                <input
                  type="number"
                  name="recorded_temp_fahrenheit"
                  id="recorded_temp_fahrenheit"
                  required
                  step="0.1"
                  value={formData.recorded_temp_fahrenheit}
                  onChange={handleTempChange}
                  className={`block w-full rounded-xl bg-[#f7eccf]/10 border ${
                    isWithinRange ? 'border-green-500/50' : 'border-red-500/50'
                  } text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isWithinRange ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              {!isWithinRange && (
                <p className="mt-1 text-xs text-red-500">
                  Temperature is outside the acceptable range.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="shift" className="block text-sm font-medium text-[#f7eccf]/90">
                Shift
              </label>
              <select
                name="shift"
                id="shift"
                value={formData.shift || 'morning'}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
              >
                <option value="morning" className="bg-[#1C1C1C]">Morning</option>
                <option value="afternoon" className="bg-[#1C1C1C]">Afternoon</option>
                <option value="evening" className="bg-[#1C1C1C]">Evening</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-[#f7eccf]/90">
                Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl bg-[#f7eccf]/10 border border-[#f7eccf]/20 text-[#f7eccf] shadow-sm focus:ring-2 focus:ring-[#f7eccf]/50 focus:border-transparent p-2.5"
                placeholder="Any additional observations..."
              ></textarea>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#f7eccf]/10 text-[#f7eccf] rounded-full text-sm hover:bg-[#f7eccf]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#f7eccf]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#f7eccf] text-[#1C1C1C] rounded-full text-sm font-medium hover:bg-[#f7eccf]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#f7eccf]"
              >
                Log Temperature
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AnimatePresence>
  );
}

export default function TemperaturePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('monitoring')
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  
  // State for API data
  const [monitoringPoints, setMonitoringPoints] = useState<TempMonitoringPoint[]>([])
  const [temperatureLogs, setTemperatureLogs] = useState<TempLog[]>([])
  const [violations, setViolations] = useState<TempViolation[]>([])
  const [dueChecks, setDueChecks] = useState<DueCheck[]>([])
  const [departments, setDepartments] = useState<string[]>(['all'])
  
  // UI state
  const [loading, setLoading] = useState({
    points: false,
    logs: false,
    violations: false,
    checks: false
  })
  const [error, setError] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Modal state
  const [monitoringPointModal, setMonitoringPointModal] = useState({
    isOpen: false,
    point: null as TempMonitoringPoint | null
  })
  
  const [temperatureLogModal, setTemperatureLogModal] = useState({
    isOpen: false,
    point: null as TempMonitoringPoint | null
  })
  
  // Fetch monitoring points on mount or refresh
  useEffect(() => {
    const fetchMonitoringPoints = async () => {
      setLoading(prev => ({ ...prev, points: true }))
      try {
        const response = await temperatureService.getMonitoringPoints({}, user)
        setMonitoringPoints(response.items || [])
        
        // Extract unique departments for filtering
        const deptSet = new Set(['all'])
        response.items.forEach((point: TempMonitoringPoint) => {
          if (point.department_id) {
            deptSet.add(`Department ${point.department_id}`) // Ideally, we'd fetch department names
          }
        })
        setDepartments(Array.from(deptSet) as string[])
        
        // Also fetch temperature logs for these points
        fetchTemperatureLogs(response.items.map((p: TempMonitoringPoint) => p.id))
      } catch (err: any) {
        console.error('Error fetching monitoring points:', err)
        setError(err.message || 'Failed to load monitoring points')
      } finally {
        setLoading(prev => ({ ...prev, points: false }))
      }
    }
    
    fetchMonitoringPoints()
  }, [user, refreshTrigger])
  
  // Fetch temperature logs for monitoring points
  const fetchTemperatureLogs = async (pointIds: number[]) => {
    if (!pointIds.length) return
    
    setLoading(prev => ({ ...prev, logs: true }))
    try {
      // Fetch logs for each point - in a real app, you might want to batch this
      const logPromises = pointIds.map(pointId => 
        temperatureService.getTemperatureLogs({ monitoring_point_id: pointId, limit: 1, order: 'desc' })
      )
      
      const results = await Promise.all(logPromises)
      const latestLogs: TempLog[] = []
      
      results.forEach(result => {
        if (result.items && result.items.length > 0) {
          latestLogs.push(result.items[0])
        }
      })
      
      setTemperatureLogs(latestLogs)
    } catch (err: any) {
      console.error('Error fetching temperature logs:', err)
      // Don't set error state here to avoid overriding monitoring points error
    } finally {
      setLoading(prev => ({ ...prev, logs: false }))
    }
  }
  
  // Fetch violations when tab changes to violations
  useEffect(() => {
    if (activeTab === 'violations') {
      const fetchViolations = async () => {
        setLoading(prev => ({ ...prev, violations: true }))
        try {
          const response = await temperatureService.getTemperatureViolations()
          setViolations(response.items || [])
        } catch (err: any) {
          console.error('Error fetching violations:', err)
          setError(err.message || 'Failed to load violations')
        } finally {
          setLoading(prev => ({ ...prev, violations: false }))
        }
      }
      
      fetchViolations()
    }
  }, [activeTab, refreshTrigger])
  
  // Fetch due checks when tab changes to checks
  useEffect(() => {
    if (activeTab === 'checks') {
      const fetchDueChecks = async () => {
        setLoading(prev => ({ ...prev, checks: true }))
        try {
          const response = await temperatureService.getDueTemperatureChecks()
          setDueChecks(response || [])
        } catch (err: any) {
          console.error('Error fetching due checks:', err)
          setError(err.message || 'Failed to load due checks')
        } finally {
          setLoading(prev => ({ ...prev, checks: false }))
        }
      }
      
      fetchDueChecks()
    }
  }, [activeTab, refreshTrigger])
  
  // Handle creating a new monitoring point
  const handleCreateMonitoringPoint = async (data: TempMonitoringPointCreate) => {
    try {
      await temperatureService.createMonitoringPoint(data)
      setMonitoringPointModal({ isOpen: false, point: null })
      // Refresh data
      setRefreshTrigger(prev => prev + 1)
      
      // Show success message
      setError('') // Clear any existing errors
    } catch (err: any) {
      console.error('Error creating monitoring point:', err)
      setError(err.message || 'Failed to create monitoring point')
    }
  }
  
  // Handle updating a monitoring point
  const handleUpdateMonitoringPoint = async (data: TempMonitoringPointCreate) => {
    if (!monitoringPointModal.point) return
    
    try {
      await temperatureService.updateMonitoringPoint(monitoringPointModal.point.id, data)
      setMonitoringPointModal({ isOpen: false, point: null })
      // Refresh data
      setRefreshTrigger(prev => prev + 1)
      
      // Show success message
      setError('') // Clear any existing errors
    } catch (err: any) {
      console.error('Error updating monitoring point:', err)
      setError(err.message || 'Failed to update monitoring point')
    }
  }
  
  // Handle creating a new temperature log
  const handleCreateTemperatureLog = async (data: TempLogCreate) => {
    if (!user?.employee_id) {
      setError('You must be logged in with an employee ID to log temperatures')
      return
    }
    
    try {
      await temperatureService.createTemperatureLog(data)
      setTemperatureLogModal({ isOpen: false, point: null })
      // Refresh data
      setRefreshTrigger(prev => prev + 1)
      
      // Show success message
      setError('') // Clear any existing errors
    } catch (err: any) {
      console.error('Error logging temperature:', err)
      setError(err.message || 'Failed to log temperature')
    }
  }
  
  // Handle resolving a violation
  const handleResolveViolation = async (violationId: number) => {
    if (!user?.employee_id) {
      setError('You must be logged in with an employee ID to resolve violations')
      return
    }
    
    try {
      await temperatureService.resolveTemperatureViolation(violationId, {
        resolved_by: user.employee_id as number,
        resolution_notes: 'Resolved by user'
      })
      
      // Refresh the data
      setRefreshTrigger(prev => prev + 1)
      setError('') // Clear any existing errors
    } catch (err: any) {
      console.error('Error resolving violation:', err)
      setError(err.message || 'Failed to resolve violation')
    }
  }
  
  // Helper function to refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1)
  }
  
  // Helper function to get the latest temperature for a monitoring point
  const getLatestTemperature = (pointId: number): number | null => {
    const log = temperatureLogs.find(log => log.monitoring_point_id === pointId)
    return log ? log.recorded_temp_fahrenheit : null
  }
  
  // Filter monitoring points based on search term and department
  const filteredMonitoringPoints = monitoringPoints.filter(point => {
    const matchesSearch = searchTerm === '' || 
      point.equipment_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || 
      (point.department_id && `Department ${point.department_id}` === departmentFilter)
    
    return matchesSearch && matchesDepartment
  })

  // Filter violations based on search term
  const filteredViolations = violations.filter(violation => 
    searchTerm === '' || 
    (violation.monitoring_point_name && violation.monitoring_point_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Display errors if any */}
      {error && (
        <motion.div 
          className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setError('')}
            className="mt-2 text-red-500 hover:bg-red-500/10"
          >
            Dismiss
          </Button>
        </motion.div>
      )}

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
                onClick={() => setMonitoringPointModal({ isOpen: true, point: null })}
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
                  onClick={refreshData}
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
            {/* Loading state */}
            {loading.points ? (
              <motion.div 
                variants={itemVariants}
                className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                  <Loader className="h-8 w-8 text-[#f7eccf]/50 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">Loading monitoring points...</h3>
              </motion.div>
            ) : filteredMonitoringPoints.length === 0 ? (
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
              filteredMonitoringPoints.map(point => {
                const latestTemp = getLatestTemperature(point.id)
                const isWithinRange = latestTemp !== null && 
                  latestTemp >= point.min_temp_fahrenheit && 
                  latestTemp <= point.max_temp_fahrenheit
                
                return (
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
                                point.is_active
                                  ? 'bg-green-500' 
                                  : 'bg-red-500'
                              }`}></span>
                              <h3 className="font-semibold text-lg text-[#f7eccf]">{point.equipment_type}</h3>
                              <span className="ml-2 px-3 py-1 text-xs font-medium rounded-full bg-[#f7eccf]/10 text-[#f7eccf]/80">
                                Department {point.department_id || 'N/A'}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-[#f7eccf]/5 rounded-2xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-[#f7eccf]/70">Temperature Range</span>
                                  <span className="text-sm font-medium text-[#f7eccf]">
                                    {point.min_temp_fahrenheit}°F - {point.max_temp_fahrenheit}°F
                                  </span>
                                </div>
                                
                                {/* Temperature visualization */}
                                <div className="relative h-8 bg-[#f7eccf]/10 rounded-full overflow-hidden mt-2">
                                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-red-500 w-full"></div>
                                  <div className="absolute inset-y-0 flex items-center justify-center w-full">
                                    <div className="h-full w-[2px] bg-white/50 absolute" style={{ 
                                      left: `${(point.min_temp_fahrenheit / (point.max_temp_fahrenheit * 1.2)) * 100}%` 
                                    }}></div>
                                    <div className="h-full w-[2px] bg-white/50 absolute" style={{ 
                                      left: `${(point.max_temp_fahrenheit / (point.max_temp_fahrenheit * 1.2)) * 100}%` 
                                    }}></div>
                                    {latestTemp !== null && (
                                      <div className="h-6 w-6 rounded-full bg-white absolute" style={{ 
                                        left: `${(latestTemp / (point.max_temp_fahrenheit * 1.2)) * 100}%`,
                                        border: '2px solid white',
                                        backgroundColor: isWithinRange ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                                      }}></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col justify-center bg-[#f7eccf]/5 rounded-2xl p-3">
                                  <span className="text-xs text-[#f7eccf]/70 mb-1">Check Frequency</span>
                                  <div className="flex items-center">
                                    <Clock size={14} className="mr-1 text-[#f7eccf]/60" />
                                    <span className="text-sm text-[#f7eccf]">Every {point.check_frequency_hours} hours</span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col justify-center bg-[#f7eccf]/5 rounded-2xl p-3">
                                  <span className="text-xs text-[#f7eccf]/70 mb-1">Equipment ID</span>
                                  <div className="flex items-center">
                                    <Calendar size={14} className="mr-1 text-[#f7eccf]/60" />
                                    <span className="text-sm text-[#f7eccf]">{point.equipment_id || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center">
                            <motion.div 
                              className={`text-3xl font-bold mb-2 ${
                                latestTemp === null
                                  ? 'text-[#f7eccf]/50'
                                  : isWithinRange
                                    ? 'text-green-500'
                                    : 'text-red-500'
                              }`}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            >
                              {latestTemp !== null ? `${latestTemp}°F` : '--°F'}
                            </motion.div>
                            
                            <div className="flex gap-2">
                              <motion.button
                                className="bg-[#f7eccf] text-[#1C1C1C] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 shadow-md"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setTemperatureLogModal({ isOpen: true, point })}
                              >
                                Log Temperature
                              </motion.button>
                              
                              <motion.button
                                className="bg-[#f7eccf]/10 text-[#f7eccf] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMonitoringPointModal({ isOpen: true, point })}
                              >
                                Edit
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                )
              })
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
            {/* Loading state */}
            {loading.violations ? (
              <motion.div 
                variants={itemVariants}
                className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
                  <Loader className="h-8 w-8 text-[#f7eccf]/50 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">Loading violations...</h3>
              </motion.div>
            ) : filteredViolations.length === 0 ? (
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
                            <h3 className="font-semibold text-lg text-[#f7eccf]">
                              {violation.monitoring_point_name || `Monitoring Point ${violation.monitoring_point_id}`}
                            </h3>
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
                                {violation.recorded_temp}°F
                              </span>
                              <span className="text-xs text-[#f7eccf]/70 mt-1">
                                Allowed: {violation.allowed_min}°F - {violation.allowed_max}°F
                              </span>
                            </div>
                            
                            <div className="bg-[#f7eccf]/5 rounded-2xl p-4 flex flex-col justify-center">
                              <span className="text-xs text-[#f7eccf]/70 mb-1">Violation Type</span>
                              <span className="text-sm font-medium text-[#f7eccf]">
                                {violation.violation_type}
                              </span>
                              <div className="flex items-center mt-1">
                                <Clock size={12} className="mr-1 text-[#f7eccf]/60" />
                                <span className="text-xs text-[#f7eccf]/70">
                                  {new Date(violation.created_at).toLocaleString()}
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
                                    onClick={() => handleResolveViolation(violation.id)}
                                  >
                                    <CheckCircle size={14} />
                                    Resolve
                                  </motion.button>
                                )}
                             
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
                
                {loading.checks ? (
                  <div className="flex justify-center py-8">
                    <Loader className="h-8 w-8 text-[#f7eccf]/50 animate-spin" />
                  </div>
                ) : dueChecks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-[#f7eccf]">No temperature checks due at this time.</p>
                  </div>
                ) : (
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
                        {dueChecks.map((check, index) => {
                          // Find the corresponding monitoring point
                          const point = monitoringPoints.find(p => p.id === check.monitoring_point_id)
                          
                          return (
                            <motion.tr 
                              key={check.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="hover:bg-[#f7eccf]/5 transition-colors"
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]">
                                {check.monitoring_point_name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]">
                                {check.department_name || `Department ${check.department_id}` || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]/80">
                                {check.last_check_time ? new Date(check.last_check_time).toLocaleString() : 'Never'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-[#f7eccf]/80">
                                {new Date(check.next_check_due).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                  check.status === 'due' 
                                    ? 'bg-amber-500/20 text-amber-500' 
                                    : check.status === 'overdue'
                                    ? 'bg-red-500/20 text-red-500'
                                    : 'bg-green-500/20 text-green-500'
                                }`}>
                                  {check.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <motion.button 
                                  className="text-[#f7eccf] hover:text-[#f7eccf]/80 text-sm flex items-center gap-1 bg-[#f7eccf]/10 px-3 py-1 rounded-full"
                                  whileHover={{ scale: 1.05 }}
                                  onClick={() => {
                                    // If we found the point, open the log modal
                                    if (point) {
                                      setTemperatureLogModal({
                                        isOpen: true,
                                        point
                                      })
                                    }
                                  }}
                                >
                                  Log Reading
                                  <ChevronRight size={14} />
                                </motion.button>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
                      {monitoringPoints.filter(p => p.is_active).length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Active Points</div>
                  </div>
                  
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {dueChecks.filter(c => c.status === 'due').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Due Checks</div>
                  </div>
                  
                  <div className="bg-[#f7eccf]/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {dueChecks.filter(c => c.status === 'overdue').length}
                    </div>
                    <div className="text-xs text-[#f7eccf]/70 mt-1">Overdue</div>
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
                      {violations.filter(v => v.status !== 'resolved').length}
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
      
      {/* Add/Edit Monitoring Point Modal */}
      <MonitoringPointModal
        isOpen={monitoringPointModal.isOpen}
        onClose={() => setMonitoringPointModal({ isOpen: false, point: null })}
        onSave={monitoringPointModal.point 
          ? handleUpdateMonitoringPoint 
          : handleCreateMonitoringPoint}
        point={monitoringPointModal.point || undefined}
      />
      
      {/* Log Temperature Modal */}
      <TemperatureLogModal
        isOpen={temperatureLogModal.isOpen}
        onClose={() => setTemperatureLogModal({ isOpen: false, point: null })}
        onSave={handleCreateTemperatureLog}
        monitoringPoint={temperatureLogModal.point}
      />
    </motion.div>
  )
}