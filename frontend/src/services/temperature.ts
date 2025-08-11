// src/services/temperature.ts
import api from './api';
import { User } from '@/contexts/AuthContext';
import DepartmentFilter from './department-filter';

// Types for Temperature Monitoring
export interface TempMonitoringPoint {
  id: number;
  equipment_type: string;
  department_id?: number | null;
  min_temp_fahrenheit: number;
  max_temp_fahrenheit: number;
  check_frequency_hours: number;
  is_active: boolean;
  equipment_id?: number | null;
  created_at: string;
}

export interface TempMonitoringPointCreate {
  equipment_type: string;
  department_id?: number | null;
  min_temp_fahrenheit: number;
  max_temp_fahrenheit: number;
  check_frequency_hours?: number;
  is_active?: boolean;
  equipment_id?: number | null;
}

export interface TempLog {
  id: number;
  monitoring_point_id: number;
  recorded_temp_fahrenheit: number;
  recorded_by: number;
  recorded_at: string;
  is_within_range?: boolean;
  notes?: string;
  shift?: string;
}

export interface TempLogCreate {
  monitoring_point_id: number;
  recorded_temp_fahrenheit: number;
  recorded_by: number;
  is_within_range?: boolean;
  notes?: string;
  shift?: string;
}

export interface TempViolation {
  id: number;
  monitoring_point_id: number;
  monitoring_point_name?: string;
  temp_log_id: number;
  recorded_temp: number;
  allowed_min: number;
  allowed_max: number;
  violation_type: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: number;
  resolution_notes?: string;
}

export interface DueCheck {
  id: number;
  monitoring_point_id: number;
  monitoring_point_name: string;
  department_id?: number;
  department_name?: string;
  last_check_time?: string;
  next_check_due: string;
  status: string;
}

// Parameters for API requests
export interface MonitoringPointParams {
  skip?: number;
  limit?: number;
  department_id?: number;
  equipment_id?: number;
  is_active?: boolean;
  sort?: string;
  order?: string;
  search?: string;
}

export interface TempLogParams {
  skip?: number;
  limit?: number;
  monitoring_point_id?: number;
  start_date?: string;
  end_date?: string;
  is_within_range?: boolean;
  sort?: string;
  order?: string;
}

export interface ViolationParams {
  skip?: number;
  limit?: number;
  monitoring_point_id?: number;
  status?: string;
  violation_type?: string;
  severity?: string;
  sort?: string;
  order?: string;
}

// API functions for monitoring points
export const getMonitoringPoints = async (params: MonitoringPointParams = {}, user: User | null = null) => {
  // Apply department filtering based on user role
  const filteredParams = DepartmentFilter.applyFilter(params, user);
  
  try {
    const response = await api.get('/temperature/monitoring-points', { params: filteredParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching monitoring points:', error);
    throw error;
  }
};

export const getMonitoringPoint = async (id: number) => {
  try {
    const response = await api.get(`/temperature/monitoring-points/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching monitoring point ${id}:`, error);
    throw error;
  }
};

export const createMonitoringPoint = async (data: TempMonitoringPointCreate) => {
  try {
    const response = await api.post('/temperature/monitoring-points', data);
    return response.data;
  } catch (error) {
    console.error('Error creating monitoring point:', error);
    throw error;
  }
};

export const updateMonitoringPoint = async (id: number, data: Partial<TempMonitoringPointCreate>) => {
  try {
    const response = await api.put(`/temperature/monitoring-points/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating monitoring point ${id}:`, error);
    throw error;
  }
};

export const deleteMonitoringPoint = async (id: number) => {
  try {
    const response = await api.delete(`/temperature/monitoring-points/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting monitoring point ${id}:`, error);
    throw error;
  }
};

// API functions for temperature logs
export const getTemperatureLogs = async (params: TempLogParams = {}) => {
  try {
    const response = await api.get('/temperature/logs', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching temperature logs:', error);
    throw error;
  }
};

export const createTemperatureLog = async (data: TempLogCreate) => {
  try {
    const response = await api.post('/temperature/logs', data);
    return response.data;
  } catch (error) {
    console.error('Error creating temperature log:', error);
    throw error;
  }
};

// API functions for violations
export const getTemperatureViolations = async (params: ViolationParams = {}) => {
  try {
    const response = await api.get('/temperature/violations', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching temperature violations:', error);
    throw error;
  }
};

export const updateTemperatureViolation = async (id: number, data: any) => {
  try {
    const response = await api.put(`/temperature/violations/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating temperature violation ${id}:`, error);
    throw error;
  }
};

export const resolveTemperatureViolation = async (id: number, data: { resolved_by: number, resolution_notes?: string }) => {
  try {
    const response = await api.patch(`/temperature/violations/${id}/resolve`, data);
    return response.data;
  } catch (error) {
    console.error(`Error resolving temperature violation ${id}:`, error);
    throw error;
  }
};

// API function for due checks
export const getDueTemperatureChecks = async () => {
  try {
    const response = await api.get('/temperature/due-checks');
    return response.data;
  } catch (error) {
    console.error('Error fetching due temperature checks:', error);
    throw error;
  }
};

export default {
  getMonitoringPoints,
  getMonitoringPoint,
  createMonitoringPoint,
  updateMonitoringPoint,
  deleteMonitoringPoint,
  getTemperatureLogs,
  createTemperatureLog,
  getTemperatureViolations,
  updateTemperatureViolation,
  resolveTemperatureViolation,
  getDueTemperatureChecks
};