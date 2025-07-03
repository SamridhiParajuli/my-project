// app/(dashboard)/preorders/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'

export default function PreOrdersPage() {
  const [activeTab, setActiveTab] = useState('pending')
  
  // Demo pre-orders data
  const preorders = [
    { 
      id: 1, 
      customer: "Jane Doe", 
      item: "Birthday Cake", 
      details: "Chocolate cake with vanilla frosting, 'Happy 30th Birthday Sarah!' inscription",
      department: "Bakery",
      status: "pending", 
      dueDate: "2025-06-25",
      phone: "555-123-4567"
    },
    { 
      id: 2, 
      customer: "Michael Smith", 
      item: "Party Platter", 
      details: "Assorted cheese and crackers for 15 people, no nuts",
      department: "Deli",
      status: "processing", 
      dueDate: "2025-06-24",
      phone: "555-234-5678"
    },
    { 
      id: 3, 
      customer: "Robert Johnson", 
      item: "Custom Cut Steaks", 
      details: "6 ribeye steaks, 1.5 inches thick",
      department: "Meat",
      status: "ready", 
      dueDate: "2025-06-21",
      phone: "555-345-6789"
    },
    { 
      id: 4, 
      customer: "Emily Williams", 
      item: "Fruit Basket", 
      details: "Medium gift basket with seasonal fruits, no citrus",
      department: "Produce",
      status: "completed", 
      dueDate: "2025-06-18",
      phone: "555-456-7890"
    },
  ]
  
  // Filter preorders based on active tab
  const filteredPreorders = preorders.filter(preorder => {
    if (activeTab === 'all') return true
    return preorder.status === activeTab
  })
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Pre-Orders</h2>
          <p className="text-dark-600 mb-6">
            Manage customer pre-orders and special requests
          </p>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6 overflow-x-auto">
            {['all', 'pending', 'processing', 'ready', 'completed'].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
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
          
          {/* Pre-orders list */}
          <div className="space-y-4">
            {filteredPreorders.length > 0 ? (
              filteredPreorders.map(preorder => (
                <div key={preorder.id} className="p-4 border border-cream-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-dark-800">{preorder.item}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          preorder.status === 'completed' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : preorder.status === 'ready'
                            ? 'bg-accent-blue/10 text-accent-blue'
                            : preorder.status === 'processing'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-red/10 text-accent-red'
                        }`}>
                          {preorder.status}
                        </span>
                      </div>
                      <p className="text-sm text-dark-600 mt-1">{preorder.details}</p>
                      <div className="mt-2 text-sm">
                        <p className="text-dark-600">Customer: {preorder.customer} | {preorder.phone}</p>
                        <p className="text-dark-600">Department: {preorder.department}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm text-dark-500">Due: {preorder.dueDate}</span>
                      <div className="flex gap-2">
                        <button className="text-accent-blue text-sm hover:underline">Update Status</button>
                        <button className="text-accent-blue text-sm hover:underline">View Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-dark-600">No pre-orders found in this category</div>
            )}
          </div>
          
          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <button className="bg-dark-800 text-cream-100 px-4 py-2 rounded-lg hover:bg-dark-900 transition-colors">
              + New Pre-Order
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}