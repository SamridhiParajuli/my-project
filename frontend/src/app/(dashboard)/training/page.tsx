// app/(dashboard)/training/page.tsx
'use client'

import { Card, CardBody } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'

export default function TrainingPage() {
  const { isManager } = useAuth()
  
  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Training Management</h2>
          <p className="text-dark-600">
            This page allows managers to assign, track, and manage employee training programs and certifications.
          </p>
          {!isManager && (
            <div className="mt-4 p-4 bg-accent-red/10 text-accent-red rounded-lg">
              You need manager privileges to manage training.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}