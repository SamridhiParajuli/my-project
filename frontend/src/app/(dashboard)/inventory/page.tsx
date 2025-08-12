// app/(dashboard)/inventory/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  Plus, 
  Filter, 
  SortDesc, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { getDepartments } from '@/services/departments';
import { getEmployees } from '@/services/employees';
import {
  getInventoryRequests,
  getInventoryRequest,
  createInventoryRequest,
  updateInventoryRequest,
  deleteInventoryRequest,
  updateInventoryRequestStatus,
  getInventoryRequestUpdates,
  addInventoryRequestUpdate,
  InventoryRequest,
  InventoryRequestCreate,
  InventoryRequestUpdate,
  InventoryRequestUpdateLog
} from '@/services/inventory';
import CreateInventoryRequestModal from '@/components/inventory/CreateInventoryRequestModal';
import ViewInventoryRequestModal from '@/components/inventory/ViewInventoryRequestModal';
import InventoryRequestCard from '@/components/inventory/InventoryRequestCard';

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
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

export default function InventoryPage() {
  const { user, isManager, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDepartment, setActiveDepartment] = useState<number | null>(null);
  const [sortField, setSortField] = useState('requested_date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InventoryRequest | null>(null);
  const [requestUpdates, setRequestUpdates] = useState<InventoryRequestUpdateLog[]>([]);
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch departments
        const departmentsData = await getDepartments();
        setDepartments(departmentsData.items || []);
        
        // Fetch employees instead of users
        const employeesData = await getEmployees();
        setEmployees(employeesData.items || []);
        
        // Fetch initial inventory requests
        await fetchRequests();
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Fetch requests based on filters
  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        sort: sortField,
        order: sortOrder
      };
      
      // Add status filter if not 'all'
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      
      // Add department filter if selected
      if (activeDepartment) {
        params.requesting_department = activeDepartment;
      }
      
      // Add search term if provided
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await getInventoryRequests(params);
      setRequests(response.items || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load requests. Please try again.');
      setLoading(false);
    }
  };
  
  // Apply filters when they change
  useEffect(() => {
    fetchRequests();
  }, [activeTab, activeDepartment, sortField, sortOrder, searchTerm]);
  
  // Handle opening the view modal and fetching request details
  const handleViewRequest = async (request: InventoryRequest) => {
    setSelectedRequest(request);
    
    try {
      // Fetch the latest updates for this request
      const updates = await getInventoryRequestUpdates(request.id);
      setRequestUpdates(updates || []);
      
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching request updates:', error);
    }
  };
  
  // Create new request
  const handleCreateRequest = async (data: InventoryRequestCreate) => {
    try {
      await createInventoryRequest(data);
      setShowCreateModal(false);
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request. Please try again.');
    }
  };
  
  // Update request
  const handleUpdateRequest = async (id: number, data: InventoryRequestUpdate) => {
    try {
      await updateInventoryRequest(id, data);
      
      // Update the selected request in state
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, ...data } : null);
      }
      
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request. Please try again.');
    }
  };
  
  // Delete request
  const handleDeleteRequest = async (id: number) => {
    try {
      await deleteInventoryRequest(id);
      setShowViewModal(false);
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request. Please try again.');
    }
  };
  
  // Update request status
  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateInventoryRequestStatus(id, status);
      
      // Update the selected request in state
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, status } : null);
      }
      
      // Refresh updates after status change
      const updates = await getInventoryRequestUpdates(id);
      setRequestUpdates(updates || []);
      
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };
  
  // Add update to request
  const handleAddUpdate = async (id: number, data: { notes?: string }) => {
    try {
      await addInventoryRequestUpdate(id, data);
      
      // Refresh updates
      const updates = await getInventoryRequestUpdates(id);
      setRequestUpdates(updates || []);
    } catch (error) {
      console.error('Error adding update:', error);
      alert('Failed to add update. Please try again.');
    }
  };
  
  // Toggle sort order
  const handleToggleSort = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };
  
  if (loading && requests.length === 0) {
    return <LoadingSpinner text="Loading inventory requests..." />;
  }
  
  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-[#f7eccf]/10 rounded-2xl mr-4">
                  <Package className="h-6 w-6 text-[#f7eccf]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#f7eccf]">Inventory Management</h1>
                  <p className="text-[#f7eccf]/70 text-sm mt-1">
                    Track inventory requests and stock levels
                  </p>
                </div>
              </div>
              
              {(isManager || isAdmin) && (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    className="bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] flex items-center gap-2 rounded-full shadow-md px-5 py-2.5"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus size={18} />
                    <span>New Request</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Filter and Search Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-none bg-[#1C1C1C] overflow-hidden rounded-3xl shadow-xl">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap bg-[#f7eccf]/10 p-1 rounded-xl">
                {['all', 'pending', 'in_progress', 'approved', 'completed'].map((tab) => (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                      activeTab === tab 
                        ? 'bg-[#f7eccf] text-[#1C1C1C]' 
                        : 'text-[#f7eccf]/70 hover:text-[#f7eccf]'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {activeTab === tab && (
                      <motion.div
                        className="absolute inset-0 bg-[#f7eccf] rounded-lg"
                        layoutId="tabBackground"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    {tab === 'all' ? 'All' : 
                     tab === 'in_progress' ? 'In Progress' : 
                     tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </motion.button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-1/3">
                <SearchBar
                  placeholder="Search inventory requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#f7eccf]/5 border-[#f7eccf]/20 text-[#f7eccf] placeholder:text-[#f7eccf]/50 focus:border-[#f7eccf]/50"
                  containerClassName="w-full"
                />
              </div>
            </div>

            {/* Filter Options */}
            <div className="flex flex-wrap items-center mt-4 pt-4 border-t border-[#f7eccf]/10">
              <span className="text-sm text-[#f7eccf]/70 mr-3 mb-2">Filter by:</span>
              <div className="flex flex-wrap gap-2 flex-1 mb-2">
                <motion.button
                  key="all-depts"
                  className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                    activeDepartment === null
                      ? 'bg-[#f7eccf] text-[#1C1C1C]'
                      : 'bg-[#f7eccf]/10 text-[#f7eccf]/70 hover:bg-[#f7eccf]/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveDepartment(null)}
                >
                  All Departments
                </motion.button>
                {departments.map(dept => (
                  <motion.button
                    key={dept.id}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeDepartment === dept.id
                        ? 'bg-[#f7eccf] text-[#1C1C1C]'
                        : 'bg-[#f7eccf]/10 text-[#f7eccf]/70 hover:bg-[#f7eccf]/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveDepartment(dept.id)}
                  >
                    {dept.name}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-2">
                <motion.button
                  className="p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={`Sort by date (${sortOrder === 'asc' ? 'Oldest first' : 'Newest first'})`}
                  onClick={handleToggleSort}
                >
                  <SortDesc size={16} />
                </motion.button>
                <motion.button
                  className="p-2 bg-[#f7eccf]/10 rounded-full text-[#f7eccf] hover:bg-[#f7eccf]/20 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Refresh requests"
                  onClick={() => fetchRequests()}
                >
                  <RefreshCw size={16} />
                </motion.button>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div 
          variants={itemVariants}
          className="bg-red-500/10 text-red-500 p-4 rounded-3xl shadow-lg text-center"
        >
          {error}
          <Button
            variant="outline"
            className="ml-4 border-red-500/30 text-red-500 hover:bg-red-500/10"
            onClick={() => fetchRequests()}
          >
            Try Again
          </Button>
        </motion.div>
      )}

      {/* Loading Indicator */}
      {loading && requests.length > 0 && (
        <motion.div 
          variants={itemVariants}
          className="flex justify-center py-4"
        >
          <div className="flex items-center gap-2 text-[#f7eccf]/70">
            <RefreshCw size={18} className="animate-spin" />
            <span>Updating requests...</span>
          </div>
        </motion.div>
      )}

      {/* Requests List */}
      {!loading && requests.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="bg-[#1C1C1C] rounded-3xl shadow-xl py-16 px-6 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-[#f7eccf]/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-[#f7eccf]/50" />
          </div>
          <h3 className="text-xl font-semibold text-[#f7eccf] mb-2">No requests found</h3>
          <p className="text-[#f7eccf]/70 max-w-md mx-auto">
            {searchTerm 
              ? "No requests match your search criteria. Try adjusting your search."
              : activeTab !== 'all'
                ? `No ${activeTab.replace('_', ' ')} requests found.`
                : "No inventory requests have been created yet."}
          </p>
          {(isManager || isAdmin) && (
            <Button
              className="mt-6 bg-[#f7eccf] text-[#1C1C1C] hover:bg-[#e9d8ae] rounded-xl"
              onClick={() => setShowCreateModal(true)}
            >
              Create New Request
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          <AnimatePresence>
            {requests.map(request => (
              <InventoryRequestCard
                key={request.id}
                request={request}
                onClick={() => handleViewRequest(request)}
                departments={departments}
                employees={employees}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Request Modal */}
      <CreateInventoryRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRequest}
        departments={departments}
        employees={employees}
        currentUser={user}
      />

      {/* View/Edit Request Modal */}
      <ViewInventoryRequestModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        request={selectedRequest}
        updateRequest={handleUpdateRequest}
        deleteRequest={handleDeleteRequest}
        updateStatus={handleUpdateStatus}
        departments={departments}
        employees={employees}
        currentUser={user}
        requestUpdates={requestUpdates}
        addUpdate={handleAddUpdate}
      />
    </motion.div>
  );
}