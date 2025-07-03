// app/(dashboard)/inventory/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'

export default function InventoryPage() {
  const { isManager } = useAuth()
  const [activeTab, setActiveTab] = useState('requests')
  
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
  
  // Filter requests based on active tab
  const filteredRequests = requests.filter(request => {
    if (activeTab === 'all') return true
    return request.status === activeTab
  })
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold">Inventory Management</h2>
              <p className="text-dark-600">Track inventory requests and stock levels</p>
            </div>
            {isManager && (
              <button className="bg-dark-800 text-cream-100 px-4 py-2 rounded-lg hover:bg-dark-900 transition-colors">
                + New Request
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6">
            {['all', 'pending', 'in_progress', 'approved', 'completed'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === tab 
                    ? 'border-b-2 border-accent-blue text-accent-blue' 
                    : 'text-dark-600 hover:text-dark-800'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          
          {/* Requests list */}
          <div className="space-y-4">
            {filteredRequests.length > 0 ? (
              filteredRequests.map(request => (
                <div key={request.id} className="p-4 border border-cream-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-dark-800">{request.title}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          request.priority === 'high' 
                            ? 'bg-accent-red/10 text-accent-red' 
                            : request.priority === 'medium'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-green/10 text-accent-green'
                        }`}>
                          {request.priority}
                        </span>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          request.status === 'completed' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : request.status === 'approved'
                            ? 'bg-accent-blue/10 text-accent-blue'
                            : request.status === 'in_progress'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-dark-300/10 text-dark-600'
                        }`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-dark-600 mt-1">{request.description}</p>
                      <div className="mt-2 text-sm">
                        <p className="text-dark-600">From: {request.requestingDept} | To: {request.fulfillingDept}</p>
                        <p className="text-dark-600">Requested by: {request.requestedBy}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm text-dark-500">Needed by: {request.dateNeeded}</span>
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
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-dark-600">No requests found in this category</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}