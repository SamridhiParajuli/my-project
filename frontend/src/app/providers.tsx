'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { ReminderProvider } from '@/contexts/ReminderContext'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ReminderProvider>
      {children}
      </ReminderProvider>
    </AuthProvider>
  )
}