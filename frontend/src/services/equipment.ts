// src/services/equipment.ts
import api from './api';
import { User } from '@/contexts/AuthContext';
import DepartmentFilter from './department-filter';

// Equipment Types
export interface Equipment {
  id: number;
  equipment_name: string;
  equipment_type: string;
  equipment_id?: string;
  department_id?: number | null;
  location?: string;
  purchase_date?: string;
  warranty_expires?: string;
  assigned_to?: number | null;
  status: string;
  last_maintenance?: string;
  next_maintenance_due?: string;
  notes?: string;
  created_at: string;
}

export interface EquipmentCreate {
  equipment_name: string;
  equipment_type: string;
  equipment_id?: string;
  department_id?: number | null;
  location?: string;
  purchase_date?: string;
  warranty_expires?: string;
  assigned_to?: number | null;
  status?: string;
  last_maintenance?: string;
  next_maintenance_due?: string;
  notes?: string;
}

export interface EquipmentUpdate {
  equipment_name?: string;
  equipment_type?: string;
  department_id?: number | null;
  location?: string;
  assigned_to?: number | null;
  status?: string;
  last_maintenance?: string;
  next_maintenance_due?: string;
  notes?: string;
}

// Maintenance Types
export interface MaintenanceRecord {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  maintenance_type: string;
  description?: string;
  scheduled_date: string;
  completed_date?: string;
  performed_by?: number;
  performed_by_name?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface MaintenanceCreate {
  equipment_id: number;
  maintenance_type: string;
  description?: string;
  scheduled_date: string;
  performed_by?: number;
  status?: string;
  notes?: string;
}

export interface MaintenanceUpdate {
  maintenance_type?: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  performed_by?: number;
  status?: string;
  notes?: string;
}

// Repair Types
export interface RepairRequest {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  issue_description: string;
  reported_by: number;
  reported_by_name?: string;
  reported_date: string;
  assigned_to?: number | null;
  assigned_to_name?: string;
  urgency: string;
  status: string;
  resolution?: string;
  resolved_date?: string;
  notes?: string;
}

export interface RepairCreate {
  equipment_id: number;
  issue_description: string;
  reported_by: number;
  urgency?: string;
  notes?: string;
}

export interface RepairUpdate {
  issue?: string;
  assigned_to?: number | null;
  urgency?: string;
  status?: string;
  resolution?: string;
  notes?: string;
}

// Filter Params
export interface EquipmentParams {
  skip?: number;
  limit?: number;
  status?: string;
  department_id?: number;
  equipment_type?: string;
  sort?: string;
  order?: string;
  search?: string;
}

export interface MaintenanceParams {
  skip?: number;
  limit?: number;
  equipment_id?: number;
  status?: string;
  maintenance_type?: string;
  sort?: string;
  order?: string;
}

export interface RepairParams {
  skip?: number;
  limit?: number;
  equipment_id?: number;
  status?: string;
  urgency?: string;
  sort?: string;
  order?: string;
  search?: string;
}

// Equipment API Functions
export const getEquipment = async (params: EquipmentParams = {}, user: User | null = null) => {
  // Apply department filtering based on user role
  const filteredParams = DepartmentFilter.applyFilter(params, user);
  
  try {
    const response = await api.get('/equipment', { params: filteredParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }
};

export const getEquipmentById = async (id: number) => {
  try {
    const response = await api.get(`/equipment/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching equipment ${id}:`, error);
    throw error;
  }
};

export const createEquipment = async (data: EquipmentCreate) => {
  try {
    const response = await api.post('/equipment', data);
    return response.data;
  } catch (error) {
    console.error('Error creating equipment:', error);
    throw error;
  }
};

export const updateEquipment = async (id: number, data: EquipmentUpdate) => {
  try {
    const response = await api.put(`/equipment/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating equipment ${id}:`, error);
    throw error;
  }
};

export const deleteEquipment = async (id: number) => {
  try {
    const response = await api.delete(`/equipment/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting equipment ${id}:`, error);
    throw error;
  }
};

// Maintenance API Functions
export const getMaintenanceRecords = async (params: MaintenanceParams = {}) => {
  try {
    const response = await api.get('/equipment/maintenance', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    throw error;
  }
};

export const createMaintenanceRecord = async (data: MaintenanceCreate) => {
  try {
    const response = await api.post('/equipment/maintenance', data);
    return response.data;
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    throw error;
  }
};

export const updateMaintenanceRecord = async (id: number, data: MaintenanceUpdate) => {
  try {
    const response = await api.put(`/equipment/maintenance/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating maintenance record ${id}:`, error);
    throw error;
  }
};

export const updateMaintenanceStatus = async (id: number, status: string) => {
  try {
    const response = await api.patch(`/equipment/maintenance/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating maintenance status ${id}:`, error);
    throw error;
  }
};

// Repair API Functions
export const getRepairRequests = async (params: RepairParams = {}) => {
  try {
    const response = await api.get('/equipment/repairs', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    throw error;
  }
};

export const createRepairRequest = async (data: RepairCreate) => {
  try {
    const response = await api.post('/equipment/repairs', data);
    return response.data;
  } catch (error) {
    console.error('Error creating repair request:', error);
    throw error;
  }
};

export const updateRepairRequest = async (id: number, data: RepairUpdate) => {
  try {
    const response = await api.put(`/equipment/repairs/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating repair request ${id}:`, error);
    throw error;
  }
};

export const updateRepairStatus = async (id: number, status: string) => {
  try {
    const response = await api.patch(`/equipment/repairs/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating repair status ${id}:`, error);
    throw error;
  }
};

export default {
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  updateMaintenanceStatus,
  getRepairRequests,
  createRepairRequest,
  updateRepairRequest,
  updateRepairStatus
};