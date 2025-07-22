// src/services/complaints.ts
import api from './api';

export interface Complaint {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  complaint_type: string;
  description: string;
  department_involved: number | null;
  department_involved_name?: string;
  reported_by: number;
  reported_by_name?: string;
  assigned_to: number | null;
  assigned_to_name?: string;
  severity: string;
  status: string;
  resolution: string | null;
  is_private: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface ComplaintCreate {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  complaint_type: string;
  description: string;
  department_involved: number | null;
  severity: string;
  reported_by?: number;
  assigned_to?: number;
  is_private?: boolean;
}

export interface ComplaintUpdate {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  complaint_type?: string;
  description?: string;
  department_involved?: number;
  severity?: string;
  status?: string;
  resolution?: string;
  is_private?: boolean;
  assigned_to?: number;
}

// Get all complaints (filtered by status if provided)
export const getComplaints = async (params?: {
  status?: string;
  department_involved?: number;
  severity?: string;
  search?: string;
}) => {
  const response = await api.get('/complaints', { params });
  return response.data;
};

// Get complaints for a specific department
export const getDepartmentComplaints = async (
  departmentId: number,
  params?: {
    status?: string;
    severity?: string;
    search?: string;
  }
) => {
  const response = await api.get(`/complaints/department/${departmentId}`, { params });
  return response.data;
};

// Get a single complaint by ID
export const getComplaint = async (complaintId: number) => {
  const response = await api.get(`/complaints/${complaintId}`);
  return response.data;
};

// Create a new complaint
export const createComplaint = async (complaintData: ComplaintCreate) => {
  const response = await api.post('/complaints', complaintData);
  return response.data;
};

// Update a complaint
export const updateComplaint = async (
  complaintId: number,
  complaintData: ComplaintUpdate
) => {
  const response = await api.put(`/complaints/${complaintId}`, complaintData);
  return response.data;
};

// Update complaint status
export const updateComplaintStatus = async (
  complaintId: number,
  status: string
) => {
  const response = await api.patch(`/complaints/${complaintId}/status`, { status });
  return response.data;
};

// Assign complaint to an employee
export const assignComplaint = async (
  complaintId: number,
  employeeId: number
) => {
  const response = await api.patch(`/complaints/${complaintId}/assign`, { assigned_to: employeeId });
  return response.data;
};

// Toggle complaint privacy
export const toggleComplaintPrivacy = async (
  complaintId: number,
  isPrivate: boolean
) => {
  const response = await api.patch(`/complaints/${complaintId}/privacy`, { is_private: isPrivate });
  return response.data;
};

// Delete a complaint
export const deleteComplaint = async (complaintId: number) => {
  const response = await api.delete(`/complaints/${complaintId}`);
  return response.data;
};

// Get employees who can handle complaints for a specific department
export const getDepartmentHandlers = async (departmentId: number) => {
  const response = await api.get(`/complaints/department-handlers/${departmentId}`);
  return response.data;
};

export default {
  getComplaints,
  getDepartmentComplaints,
  getComplaint,
  createComplaint,
  updateComplaint,
  updateComplaintStatus,
  assignComplaint,
  toggleComplaintPrivacy,
  deleteComplaint,
  getDepartmentHandlers,
};