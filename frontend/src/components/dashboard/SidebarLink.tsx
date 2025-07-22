// Path: src/components/dashboard/SidebarLink.tsx
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SidebarLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

const SidebarLink = ({ 
  href, 
  icon, 
  children, 
  active, 
  className 
}: SidebarLinkProps) => {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
        active 
          ? 'bg-accent/10 text-accent border-l-2 border-accent' 
          : 'text-secondary/70 hover:bg-primary-light hover:text-secondary hover:border-l-2 hover:border-secondary/30',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"></span>
      )}
    </Link>
  );
};

export default SidebarLink;