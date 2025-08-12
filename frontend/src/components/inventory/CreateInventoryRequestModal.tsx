// src/components/inventory/CreateInventoryRequestModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { InventoryRequestCreate } from '@/services/inventory';
import { User } from '@/contexts/AuthContext';
import { X, ChevronDown } from 'lucide-react';

interface CreateInventoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryRequestCreate) => void;
  departments: { id: number; name: string }[];
  employees: { id: number; first_name: string; last_name: string }[];
  currentUser: User | null;
}

interface CustomDropdownProps {
  name: string;
  value: string | number | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  name, 
  value, 
  onChange, 
  options, 
  placeholder = "Select option",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string>(placeholder);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update displayed value when component value changes
  useEffect(() => {
    const selectedOption = options.find(option => option.value.toString() === value?.toString());
    setDisplayValue(selectedOption ? selectedOption.label : placeholder);
  }, [value, options, placeholder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

 const handleSelect = (optionValue: string | number) => {
  const syntheticEvent = {
    target: {
      name,
      value: optionValue,
      type: 'select',
    },
  } as unknown as React.ChangeEvent<HTMLSelectElement>;
  
  onChange(syntheticEvent);
  setIsOpen(false);
};

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50 flex justify-between items-center"
        whileHover={{ backgroundColor: 'rgba(247, 236, 207, 0.08)' }}
        whileTap={{ scale: 0.995 }}
      >
        <span className={value ? 'text-[#f7eccf]' : 'text-[#f7eccf]/50'}>
          {displayValue}
        </span>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 text-[#f7eccf]/60 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-[#252525] border border-[#f7eccf]/20 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
          >
            {options.map((option) => (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-3 py-2 hover:bg-[#f7eccf]/10 transition-colors ${
                  option.value.toString() === value?.toString() 
                    ? 'bg-[#f7eccf]/15 text-[#f7eccf]' 
                    : 'text-[#f7eccf]/80'
                }`}
                whileHover={{ backgroundColor: 'rgba(247, 236, 207, 0.15)' }}
                whileTap={{ backgroundColor: 'rgba(247, 236, 207, 0.2)' }}
              >
                {option.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden select element for form submission */}
      <select 
        name={name} 
        value={value || ''} 
        onChange={onChange} 
        className="sr-only" 
        aria-hidden="true"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const CreateInventoryRequestModal: React.FC<CreateInventoryRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  departments,
  employees,
  currentUser
}) => {
  const [formData, setFormData] = useState<InventoryRequestCreate>({
    request_title: '',
    description: '',
    requesting_department: currentUser?.department_id || null,
    fulfilling_department: null,
    requested_by: currentUser?.employee_id || null,
    assigned_to: null,
    item_category: '',
    quantity_requested: '',
    priority: 'medium',
    status: 'pending',
    needed_by_date: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : null) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1C1C1C] rounded-3xl p-6 w-full max-w-2xl shadow-xl overflow-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#f7eccf]">Create New Inventory Request</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-[#f7eccf]/10 text-[#f7eccf]"
              >
                <X size={20} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Request Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="request_title"
                    value={formData.request_title}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Item Category
                  </label>
                  <input
                    type="text"
                    name="item_category"
                    value={formData.item_category || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#f7eccf]/80">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Requesting Department
                  </label>
                  <CustomDropdown
                    name="requesting_department"
                    value={formData.requesting_department || ''}
                    onChange={handleChange}
                    options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                    placeholder="Select Department"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Fulfilling Department
                  </label>
                  <CustomDropdown
                    name="fulfilling_department"
                    value={formData.fulfilling_department || ''}
                    onChange={handleChange}
                    options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                    placeholder="Select Department"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Quantity Requested
                  </label>
                  <input
                    type="text"
                    name="quantity_requested"
                    value={formData.quantity_requested || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Priority
                  </label>
                  <CustomDropdown
                    name="priority"
                    value={formData.priority as string}
                    onChange={handleChange}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Needed By Date
                  </label>
                  <input
                    type="date"
                    name="needed_by_date"
                    value={formData.needed_by_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#f7eccf]/80">
                    Assign To
                  </label>
                  <CustomDropdown
                    name="assigned_to"
                    value={formData.assigned_to || ''}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...employees.map(emp => ({ 
                        value: emp.id, 
                        label: `${emp.first_name} ${emp.last_name}` 
                      }))
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#f7eccf]/80">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-[#f7eccf]/30 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-xl"
                >
                  Create Request
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateInventoryRequestModal;