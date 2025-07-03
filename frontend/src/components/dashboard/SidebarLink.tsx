// components/dashboard/SidebarLink.tsx
'use client'

import Link from 'next/link'

interface SidebarLinkProps {
  href: string
  children: React.ReactNode
  icon?: string
  isActive: boolean
  showText: boolean
}

const SidebarLink = ({ href, children, icon = '•', isActive, showText }: SidebarLinkProps) => {
  return (
    <Link 
      href={href} 
      className={`sidebar-link ${isActive ? 'active' : ''}`}
    >
      <span className="inline-flex items-center justify-center h-6 w-6 text-lg">{icon}</span>
      {showText && <span className="ml-3 whitespace-nowrap overflow-hidden">{children}</span>}
    </Link>
  )
}

export default SidebarLink