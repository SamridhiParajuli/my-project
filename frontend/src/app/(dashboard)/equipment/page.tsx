// app/(dashboard)/equipment/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'

export default function EquipmentPage() {
  const { isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('equipment')
  
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
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Equipment Management</h2>
              <p className="text-dark-600">Track equipment status, maintenance, and repairs</p>
            </div>
            {isManager && (
              <div className="flex gap-2">
                <button className="bg-dark-800 text-cream-100 px-3 py-2 rounded-lg hover:bg-dark-900 transition-colors text-sm">
                  + New Equipment
                </button>
                <button className="bg-accent-red text-white px-3 py-2 rounded-lg hover:bg-accent-red/90 transition-colors text-sm">
                  + Report Issue
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6">
            {['equipment', 'repairs', 'maintenance'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === tab 
                    ? 'border-b-2 border-accent-blue text-accent-blue' 
                    : 'text-dark-600 hover:text-dark-800'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          {activeTab === 'equipment' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Equipment</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Next Maintenance</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {equipmentList.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{item.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{item.type}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{item.location}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          item.status === 'operational' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : item.status === 'needs_maintenance'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-red/10 text-accent-red'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{item.department}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{item.nextMaintenance}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button className="text-accent-blue hover:underline text-sm">Details</button>
                          <button className="text-accent-blue hover:underline text-sm">Maintenance</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'repairs' && (
            <div className="space-y-4">
              {repairRequests.map(request => (
                <div key={request.id} className="p-4 border border-cream-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-dark-800">{request.equipment}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          request.urgency === 'high' 
                            ? 'bg-accent-red/10 text-accent-red' 
                            : request.urgency === 'medium'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-green/10 text-accent-green'
                        }`}>
                          {request.urgency}
                        </span>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          request.status === 'completed' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : request.status === 'assigned'
                            ? 'bg-accent-blue/10 text-accent-blue'
                            : 'bg-dark-300/10 text-dark-600'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-dark-600 mt-1">{request.issue}</p>
                      <div className="mt-2 text-sm">
                        <p className="text-dark-600">Reported by: {request.reportedBy} on {request.reportedDate}</p>
                        {request.assignedTo && <p className="text-dark-600">Assigned to: {request.assignedTo}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {request.status !== 'completed' && (
                        <button className="bg-accent-blue text-white px-3 py-1 rounded text-sm hover:bg-accent-blue/90 transition-colors">
                          Update Status
                        </button>
                      )}
                      <button className="bg-dark-800 text-white px-3 py-1 rounded text-sm hover:bg-dark-900 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg mb-2">Upcoming Maintenance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cream-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Equipment</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Scheduled Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {maintenanceSchedule.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{item.equipment}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.scheduledDate}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.assignedTo}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            item.status === 'completed' 
                              ? 'bg-accent-green/10 text-accent-green' 
                              : item.status === 'in_progress'
                              ? 'bg-gold/10 text-gold'
                              : 'bg-accent-blue/10 text-accent-blue'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.notes}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button className="text-accent-blue hover:underline text-sm">Update</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {isManager && (
                <div className="mt-6 flex justify-end">
                  <button className="bg-dark-800 text-cream-100 px-4 py-2 rounded-lg hover:bg-dark-900 transition-colors">
                    + Schedule Maintenance
                  </button>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}