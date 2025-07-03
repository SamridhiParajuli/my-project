import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: CardProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export const CardBody = ({ children, className = '' }: CardBodyProps) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title?: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export const CardHeader = ({ title, subtitle, children, className = '' }: CardHeaderProps) => {
  return (
    <div className={`px-6 pt-6 ${className}`}>
      {(title || subtitle) ? (
        <>
          {title && <h3 className="text-xl font-semibold text-dark-800 mb-2">{title}</h3>}
          {subtitle && <p className="text-dark-600 text-sm">{subtitle}</p>}
        </>
      ) : children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export const CardFooter = ({ children, className = '' }: CardFooterProps) => {
  return (
    <div className={`px-6 pb-6 ${className}`}>
      {children}
    </div>
  )
}