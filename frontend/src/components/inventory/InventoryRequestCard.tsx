// src/components/inventory/InventoryRequestCard.tsx
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InventoryRequest } from '@/services/inventory';
import { ChevronRight, Calendar } from 'lucide-react';

interface InventoryRequestCardProps {
  request: InventoryRequest;
  onClick: () => void;
  departments: { id: number; name: string }[];
  employees: { id: number; first_name: string; last_name: string }[];
}

const InventoryRequestCard: React.FC<InventoryRequestCardProps> = ({
  request,
  onClick,
  departments,
  employees
}) => {
  const cardVariants:Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
    },
    hover: {
      y: -8,
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      transition: { duration: 0.3 }
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.05,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
    },
    tap: { 
      scale: 0.95 
    }
  };

  const getDepartmentName = (id: number | null | undefined) => {
    if (!id) return 'Unspecified';
    const dept = departments.find(d => d.id === id);
    return dept ? dept.name : 'Unknown';
  };

  const getEmployeeName = (id: number | null | undefined) => {
    if (!id) return 'Unassigned';
    const employee = employees.find(e => e.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <motion.div 
      variants={cardVariants}
      whileHover="hover"
      className="relative"
    >
      <Card className={`border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl ${
        request.priority === 'high' ? 'border-l-4 border-red-500' : ''
      }`}>
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 mb-3">
                <h3 className="text-lg font-medium text-[#f7eccf]">{request.request_title}</h3>
                <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                  request.priority === 'high' 
                    ? 'bg-red-500/20 text-red-500' 
                    : request.priority === 'medium'
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-green-500/20 text-green-500'
                }`}>
                  {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                </span>
                <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                  request.status === 'completed' 
                    ? 'bg-green-500/20 text-green-500' 
                    : request.status === 'approved'
                    ? 'bg-blue-500/20 text-blue-500'
                    : request.status === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-[#f7eccf]/20 text-[#f7eccf]/90'
                }`}>
                  {request.status === 'in_progress' ? 'In Progress' : 
                   request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              
              <p className="text-[#f7eccf]/80 mb-4">{
                request.description.length > 120 
                  ? `${request.description.substring(0, 120)}...` 
                  : request.description
              }</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-[#f7eccf]/60">
                <div className="flex items-center">
                  <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                  <span>From: {getDepartmentName(request.requesting_department)}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                  <span>To: {getDepartmentName(request.fulfilling_department)}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2 w-3 h-3 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                  <span>Requested by: {getEmployeeName(request.requested_by)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar size={14} className="mr-2 text-[#f7eccf]/40" />
                  <span>Needed by: {formatDate(request.needed_by_date)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col mt-4 md:mt-0 md:ml-6 md:min-w-[140px] justify-end gap-2">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClick}
                  className="w-full border-[#f7eccf]/30 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-xl flex items-center justify-center gap-1"
                >
                  View Details
                  <ChevronRight size={14} />
                </Button>
              </motion.div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default InventoryRequestCard;