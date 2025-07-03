// app/(dashboard)/complaints/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'

export default function ComplaintsPage() {
  const [activeTab, setActiveTab] = useState('open')
  
  // Demo complaints data
  const complaints = [
    { 
      id: 1, 
      customer: "Thomas Anderson", 
      type: "Product Quality", 
      description: "Customer purchased strawberries that spoiled within 24 hours",
      department: "Produce",
      status: "open", 
      dateSubmitted: "2025-06-19",
      severity: "medium",
      contact: "555-123-4567"
    },
    { 
      id: 2, 
      customer: "Maria Garcia", 
      type: "Service", 
      description: "Customer waited 20 minutes at deli counter without being served",
      department: "Deli",
      status: "in_progress", 
      dateSubmitted: "2025-06-18",
      severity: "high",
      contact: "555-234-5678"
    },
    { 
      id: 3, 
      customer: "David Smith", 
      type: "Price Discrepancy", 
      description: "Shelf price for cereal was $3.99 but charged $5.49 at register",
      department: "Grocery",
      status: "resolved", 
      dateSubmitted: "2025-06-17",
      severity: "low",
      contact: "555-345-6789"
    },
    { 
      id: 4, 
      customer: "Jennifer Lee", 
      type: "Cleanliness", 
      description: "Customer reported spill in aisle 7 that wasn't cleaned up promptly",
      department: "Store Management",
      status: "open", 
      dateSubmitted: "2025-06-18",
      severity: "medium",
      contact: "555-456-7890"
    },
  ]
  
  // Filter complaints based on active tab
  const filteredComplaints = complaints.filter(complaint => {
    if (activeTab === 'all') return true
    return complaint.status === activeTab
  })
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Customer Complaints</h2>
          <p className="text-dark-600 mb-6">
            Track and resolve customer complaints and feedback
          </p>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6">
            {['all', 'open', 'in_progress', 'resolved'].map((tab) => (
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
          
          {/* Complaints list */}
          <div className="space-y-4">
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map(complaint => (
                <div key={complaint.id} className="p-4 border border-cream-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          complaint.severity === 'high' 
                            ? 'bg-accent-red' 
                            : complaint.severity === 'medium'
                            ? 'bg-gold'
                            : 'bg-accent-green'
                        }`}></span>
                        <h3 className="font-medium text-dark-800">{complaint.type}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          complaint.status === 'resolved' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : complaint.status === 'in_progress'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-red/10 text-accent-red'
                        }`}>
                          {complaint.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-dark-600 mt-1">{complaint.description}</p>
                      <div className="mt-2 text-sm">
                        <p className="text-dark-600">Customer: {complaint.customer} | {complaint.contact}</p>
                        <p className="text-dark-600">Department: {complaint.department}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm text-dark-500">Submitted: {complaint.dateSubmitted}</span>
                      <div className="flex gap-2">
                        <button className="text-accent-blue text-sm hover:underline">Update Status</button>
                        <button className="text-accent-blue text-sm hover:underline">View Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-dark-600">No complaints found in this category</div>
            )}
          </div>
          
          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <button className="bg-dark-800 text-cream-100 px-4 py-2 rounded-lg hover:bg-dark-900 transition-colors">
              + Record New Complaint
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}