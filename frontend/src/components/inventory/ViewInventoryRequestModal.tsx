// src/components/inventory/ViewInventoryRequestModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { InventoryRequest, InventoryRequestUpdate, InventoryRequestUpdateLog } from '@/services/inventory';
import { User } from '@/contexts/AuthContext';
import { X, Clock, Calendar, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';

interface ViewInventoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: InventoryRequest | null;
  updateRequest: (id: number, data: InventoryRequestUpdate) => Promise<void>;
  deleteRequest: (id: number) => Promise<void>;
  updateStatus: (id: number, status: string) => Promise<void>;
  departments: { id: number; name: string }[];
  employees: { id: number; first_name: string; last_name: string }[];
  currentUser: User | null;
  requestUpdates: InventoryRequestUpdateLog[];
  addUpdate: (id: number, data: { notes?: string }) => Promise<void>;
}

const ViewInventoryRequestModal: React.FC<ViewInventoryRequestModalProps> = ({
  isOpen,
  onClose,
  request,
  updateRequest,
  deleteRequest,
  updateStatus,
  departments,
  employees,
  currentUser,
  requestUpdates,
  addUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InventoryRequestUpdate>({});
  const [updateNote, setUpdateNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData({
        request_title: request.request_title,
        description: request.description,
        assigned_to: request.assigned_to,
        priority: request.priority,
        needed_by_date: request.needed_by_date,
        notes: request.notes
      });
    }
  }, [request]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : null) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    
    setLoading(true);
    try {
      await updateRequest(request.id, formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!request || !window.confirm('Are you sure you want to delete this request?')) return;
    
    setLoading(true);
    try {
      await deleteRequest(request.id);
      onClose();
    } catch (error) {
      console.error('Error deleting request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!request) return;
    
    setLoading(true);
    try {
      await updateStatus(request.id, status);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!request || !updateNote.trim()) return;
    
    setLoading(true);
    try {
      await addUpdate(request.id, { notes: updateNote });
      setUpdateNote('');
    } catch (error) {
      console.error('Error adding update:', error);
    } finally {
      setLoading(false);
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

  if (!request) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1C1C1C] rounded-3xl p-6 w-full max-w-4xl shadow-xl overflow-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#f7eccf]">
                {isEditing ? 'Edit Request' : 'Request Details'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-[#f7eccf]/10 text-[#f7eccf]"
                disabled={loading}
              >
                <X size={20} />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#f7eccf]/80">
                        Request Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="request_title"
                        value={formData.request_title || ''}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#f7eccf]/80">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#f7eccf]/80">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={formData.priority || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#f7eccf]/80">
                          Assign To
                        </label>
                        <select
                          name="assigned_to"
                          value={formData.assigned_to || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                        >
                          <option value="">Unassigned</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {`${emp.first_name} ${emp.last_name}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        onClick={() => setIsEditing(false)}
                        className="border-[#f7eccf]/30 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-xl"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-xl"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 mb-4">
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
                        {request.status === 'in_progress' 
                          ? 'In Progress' 
                          : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-[#f7eccf]">{request.request_title}</h3>
                    <p className="text-[#f7eccf]/80 whitespace-pre-line">{request.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#f7eccf]/70 bg-[#f7eccf]/5 p-4 rounded-xl">
                      <div className="flex items-start">
                        <span className="mr-2 w-3 h-3 mt-1 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                        <div>
                          <div className="text-[#f7eccf]/50">Requesting Department</div>
                          <div className="text-[#f7eccf]">{getDepartmentName(request.requesting_department)}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="mr-2 w-3 h-3 mt-1 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                        <div>
                          <div className="text-[#f7eccf]/50">Fulfilling Department</div>
                          <div className="text-[#f7eccf]">{getDepartmentName(request.fulfilling_department)}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="mr-2 w-3 h-3 mt-1 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                        <div>
                          <div className="text-[#f7eccf]/50">Requested By</div>
                          <div className="text-[#f7eccf]">{getEmployeeName(request.requested_by)}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="mr-2 w-3 h-3 mt-1 rounded-full bg-[#f7eccf]/20 flex-shrink-0"></span>
                        <div>
                          <div className="text-[#f7eccf]/50">Assigned To</div>
                          <div className="text-[#f7eccf]">{getEmployeeName(request.assigned_to)}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock size={16} className="mr-2 text-[#f7eccf]/40 mt-1" />
                        <div>
                          <div className="text-[#f7eccf]/50">Requested Date</div>
                          <div className="text-[#f7eccf]">{formatDate(request.requested_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Calendar size={16} className="mr-2 text-[#f7eccf]/40 mt-1" />
                        <div>
                          <div className="text-[#f7eccf]/50">Needed By</div>
                          <div className="text-[#f7eccf]">{formatDate(request.needed_by_date)}</div>
                        </div>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-[#f7eccf]/80 mb-2">Additional Notes</h4>
                        <div className="bg-[#f7eccf]/5 p-4 rounded-xl text-[#f7eccf]/80 whitespace-pre-line">
                          {request.notes}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-4 justify-between">
                      <Button
                        variant="outline"
                        onClick={handleDelete}
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl"
                        disabled={loading}
                      >
                        Delete Request
                      </Button>
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(true)}
                          className="border-[#f7eccf]/30 text-[#f7eccf] hover:bg-[#f7eccf]/10 rounded-xl"
                          disabled={loading}
                        >
                          Edit Request
                        </Button>
                        
                        {request.status !== 'completed' && (
                          <div className="relative group">
                            <Button
                              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                              disabled={loading}
                            >
                              Update Status
                            </Button>
                            
                            <div className="absolute right-0 mt-2 w-48 bg-[#1C1C1C] border border-[#f7eccf]/20 rounded-xl shadow-lg py-1 z-10 hidden group-hover:block">
                              {['pending', 'in_progress', 'approved', 'completed'].map(status => (
                                request.status !== status && (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className="block w-full text-left px-4 py-2 text-sm text-[#f7eccf] hover:bg-[#f7eccf]/10"
                                  >
                                    {status === 'in_progress' 
                                      ? 'Mark as In Progress' 
                                      : `Mark as ${status.charAt(0).toUpperCase() + status.slice(1)}`}
                                  </button>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity log / updates section */}
                <div className="mt-8 border-t border-[#f7eccf]/10 pt-6">
                  <h3 className="text-lg font-semibold text-[#f7eccf] mb-4">Activity Log</h3>
                  
                  <div className="mb-4">
                    <div className="flex gap-3">
                      <textarea
                        value={updateNote}
                        onChange={(e) => setUpdateNote(e.target.value)}
                        placeholder="Add a note or update..."
                        className="flex-1 px-3 py-2 bg-[#f7eccf]/5 border border-[#f7eccf]/20 rounded-xl text-[#f7eccf] focus:outline-none focus:ring-1 focus:ring-[#f7eccf]/50"
                        rows={2}
                      />
                      <Button
                        onClick={handleAddUpdate}
                        disabled={!updateNote.trim() || loading}
                        className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] self-end rounded-xl"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {requestUpdates.length === 0 ? (
                      <div className="text-center py-6 text-[#f7eccf]/50">
                        No activity yet
                      </div>
                    ) : (
                      requestUpdates.map((update, index) => (
                        <div key={index} className="bg-[#f7eccf]/5 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#f7eccf]/10 flex items-center justify-center flex-shrink-0">
                              {update.previous_status ? (
                                <CheckCircle size={16} className="text-[#f7eccf]" />
                              ) : (
                                <MessageCircle size={16} className="text-[#f7eccf]" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div className="font-medium text-[#f7eccf]">
                                  {getEmployeeName(update.changed_by)}
                                  {update.previous_status && (
                                    <span className="font-normal text-[#f7eccf]/70">
                                      {' '}changed status from{' '}
                                      <span className="font-medium">{update.previous_status}</span>
                                      {' '}to{' '}
                                      <span className="font-medium">{update.new_status}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#f7eccf]/50">
                                  {new Date(update.timestamp).toLocaleString()}
                                </div>
                              </div>
                              {/* This would include notes from the update if available */}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Request timeline in sidebar */}
              <div className="bg-[#f7eccf]/5 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-[#f7eccf] mb-4">Request Timeline</h3>
                
                <div className="relative pl-6 space-y-6">
                  {/* Line connecting events */}
                  <div className="absolute top-0 bottom-0 left-3 w-px bg-[#f7eccf]/20"></div>
                  
                  <div className="relative">
                    <div className="absolute left-[-24px] w-6 h-6 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-[#f7eccf]"></div>
                    </div>
                    <div>
                      <div className="text-xs text-[#f7eccf]/50 mb-1">
                        {new Date(request.requested_date).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-[#f7eccf]">
                        Request Created
                      </div>
                      <div className="text-xs text-[#f7eccf]/70 mt-1">
                        by {getEmployeeName(request.requested_by)}
                      </div>
                    </div>
                  </div>

                  {requestUpdates
                    .filter(update => update.previous_status)
                    .map((update, index) => (
                      <div key={index} className="relative">
                        <div className="absolute left-[-24px] w-6 h-6 rounded-full bg-[#f7eccf]/10 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-[#f7eccf]/80"></div>
                        </div>
                        <div>
                          <div className="text-xs text-[#f7eccf]/50 mb-1">
                            {new Date(update.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm font-medium text-[#f7eccf]">
                            Status changed to{' '}
                            <span className={
                              update.new_status === 'completed' 
                                ? 'text-green-500' 
                                : update.new_status === 'approved'
                                ? 'text-blue-500'
                                : update.new_status === 'in_progress'
                                ? 'text-amber-500'
                                : 'text-[#f7eccf]'
                            }>
                              {update.new_status}
                            </span>
                          </div>
                          <div className="text-xs text-[#f7eccf]/70 mt-1">
                            by {getEmployeeName(update.changed_by)}
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {request.fulfilled_date && (
                    <div className="relative">
                      <div className="absolute left-[-24px] w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle size={14} className="text-green-500" />
                      </div>
                      <div>
                        <div className="text-xs text-[#f7eccf]/50 mb-1">
                          {new Date(request.fulfilled_date).toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-green-500">
                          Request Fulfilled
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewInventoryRequestModal;