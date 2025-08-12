// src/services/inventory.ts
import api from './api';

export interface InventoryRequest {
  id: number;
  request_title: string;
  description: string;
  requesting_department?: number | null;
  fulfilling_department?: number | null;
  requested_by?: number | null;  // This is employee_id
  assigned_to?: number | null;   // This is employee_id
  item_category?: string | null;
  quantity_requested?: string | null;
  priority: string;
  status: string;
  needed_by_date?: string | null;
  notes?: string | null;
  requested_date: string;
  fulfilled_date?: string | null;
}

export interface InventoryRequestCreate {
  request_title: string;
  description: string;
  requesting_department?: number | null;
  fulfilling_department?: number | null;
  requested_by?: number | null;  // This is employee_id
  assigned_to?: number | null;   // This is employee_id
  item_category?: string | null;
  quantity_requested?: string | null;
  priority?: string;
  status?: string;
  needed_by_date?: string | null;
  notes?: string | null;
}

export interface InventoryRequestUpdate {
  request_title?: string;
  description?: string;
  assigned_to?: number | null;  // This is employee_id
  priority?: string;
  status?: string;
  needed_by_date?: string | null;
  notes?: string | null;
}

export interface InventoryRequestUpdateLog {
  id: number;
  request_id: number;
  previous_status?: string | null;
  new_status: string;
  changed_by: number;  // This is employee_id
  timestamp: string;
}

export interface InventoryRequestsParams {
  skip?: number;
  limit?: number;
  status?: string;
  requesting_department?: number;
  fulfilling_department?: number;
  priority?: string;
  sort?: string;
  order?: string;
  search?: string;
}

// Get all inventory requests with optional filters
export const getInventoryRequests = async (params: InventoryRequestsParams = {}) => {
  const response = await api.get('/inventory/requests', { params });
  return response.data;
};

// Get a single inventory request by ID
export const getInventoryRequest = async (id: number) => {
  const response = await api.get(`/inventory/requests/${id}`);
  return response.data;
};

// Create a new inventory request
export const createInventoryRequest = async (data: InventoryRequestCreate) => {
  const response = await api.post('/inventory/requests', data);
  return response.data;
};

// Update an inventory request
export const updateInventoryRequest = async (id: number, data: InventoryRequestUpdate) => {
  const response = await api.put(`/inventory/requests/${id}`, data);
  return response.data;
};

// Delete an inventory request
export const deleteInventoryRequest = async (id: number) => {
  const response = await api.delete(`/inventory/requests/${id}`);
  return response.data;
};

// Update inventory request status
export const updateInventoryRequestStatus = async (id: number, status: string) => {
  const response = await api.patch(`/inventory/requests/${id}/status`, { status });
  return response.data;
};

// Get updates for an inventory request
export const getInventoryRequestUpdates = async (id: number) => {
  const response = await api.get(`/inventory/requests/${id}/updates`);
  return response.data;
};

// Add an update to an inventory request
export const addInventoryRequestUpdate = async (id: number, data: { notes?: string }) => {
  const response = await api.post(`/inventory/requests/${id}/updates`, data);
  return response.data;
};

export default {
  getInventoryRequests,
  getInventoryRequest,
  createInventoryRequest,
  updateInventoryRequest,
  deleteInventoryRequest,
  updateInventoryRequestStatus,
  getInventoryRequestUpdates,
  addInventoryRequestUpdate,
};