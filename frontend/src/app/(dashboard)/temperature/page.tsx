// app/(dashboard)/temperature/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'

export default function TemperaturePage() {
  const [activeTab, setActiveTab] = useState('monitoring')
  
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
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Temperature Monitoring</h2>
          <p className="text-dark-600 mb-6">
            Monitor and maintain safe temperatures for all food storage and display areas
          </p>
          
          {/* Tabs */}
          <div className="flex border-b border-cream-200 mb-6">
            {['monitoring', 'violations', 'checks'].map((tab) => (
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
          
          {activeTab === 'monitoring' && (
            <div className="space-y-4">
              {monitoringPoints.map(point => (
                <div key={point.id} className="p-4 border border-cream-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          point.status === 'normal' 
                            ? 'bg-accent-green' 
                            : point.status === 'warning'
                            ? 'bg-gold'
                            : 'bg-accent-red'
                        }`}></span>
                        <h3 className="font-medium text-dark-800">{point.name}</h3>
                      </div>
                      <p className="text-sm text-dark-600 mt-1">Department: {point.department}</p>
                      <p className="text-sm text-dark-600">Range: {point.minTemp}°F - {point.maxTemp}°F</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-xl font-semibold ${
                        (point.currentTemp > point.maxTemp || point.currentTemp < point.minTemp)
                          ? 'text-accent-red'
                          : (point.currentTemp > point.maxTemp - 2 || point.currentTemp < point.minTemp + 2)
                          ? 'text-gold'
                          : 'text-accent-green'
                      }`}>
                        {point.currentTemp}°F
                      </div>
                      <p className="text-xs text-dark-500">Last checked: {point.lastChecked}</p>
                      <p className="text-xs text-dark-500">Next check: {point.nextCheck}</p>
                    </div>
                    <button className="bg-dark-800 text-cream-100 px-3 py-1 rounded hover:bg-dark-900 transition-colors text-sm">
                      Log Temperature
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'violations' && (
            <div className="space-y-4">
              {violations.map(violation => (
                <div key={violation.id} className="p-4 border border-cream-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          violation.severity === 'high' 
                            ? 'bg-accent-red/10 text-accent-red' 
                            : violation.severity === 'medium'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-accent-green/10 text-accent-green'
                        }`}>
                          {violation.severity}
                        </span>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          violation.status === 'resolved' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : 'bg-accent-red/10 text-accent-red'
                        }`}>
                          {violation.status}
                        </span>
                      </div>
                      <h3 className="font-medium text-dark-800 mt-1">{violation.pointName}</h3>
                      <div className="mt-2">
                        <p className="text-sm text-dark-600">
                          <span className="text-accent-red font-medium">{violation.recordedTemp}°F</span> 
                          {' '}recorded (allowed range: {violation.allowedRange})
                        </p>
                        <p className="text-sm text-dark-600">Recorded by: {violation.recordedBy}</p>
                        <p className="text-sm text-dark-600">Time: {violation.recordedAt}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {violation.status !== 'resolved' && (
                        <button className="bg-accent-green text-white px-3 py-1 rounded hover:bg-accent-green/90 transition-colors text-sm">
                          Resolve
                        </button>
                      )}
                      <button className="bg-dark-800 text-cream-100 px-3 py-1 rounded hover:bg-dark-900 transition-colors text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'checks' && (
            <div className="p-6 border border-cream-200 rounded-lg">
              <h3 className="font-medium text-lg mb-4">Upcoming Temperature Checks</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cream-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Monitoring Point</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Last Check</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Next Check</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {monitoringPoints.map(point => (
                      <tr key={point.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{point.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{point.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{point.lastChecked}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{point.nextCheck}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-block w-3 h-3 rounded-full ${
                            point.status === 'normal' 
                              ? 'bg-accent-green' 
                              : point.status === 'warning'
                              ? 'bg-gold'
                              : 'bg-accent-red'
                          }`}></span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button className="text-accent-blue hover:underline text-sm">Log Reading</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}