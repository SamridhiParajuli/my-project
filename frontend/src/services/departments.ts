// src/services/departments.ts
import api from './api'
import { Department } from '@/types'

export interface DepartmentCreate {
  name: string
  department_code?: string
  description?: string
  manager_id?: number
  is_active?: boolean
}

export interface DepartmentUpdate {
  name?: string
  department_code?: string
  description?: string
  manager_id?: number
  is_active?: boolean
}

export interface DepartmentsParams {
  skip?: number
  limit?: number
  is_active?: boolean
  sort?: string
  order?: string
  search?: string
}

/**
 * Get all departments with optional filters
 */
export const getDepartments = async (params: DepartmentsParams = {}) => {
  const response = await api.get('/departments', { params })
  return response.data
}

/**
 * Get a single department by ID
 */
export const getDepartment = async (id: number) => {
  const response = await api.get(`/departments/${id}`)
  return response.data
}

/**
 * Create a new department
 */
export const createDepartment = async (departmentData: DepartmentCreate) => {
  const response = await api.post('/departments', departmentData)
  return response.data
}

/**
 * Update an existing department
 */
export const updateDepartment = async (id: number, departmentData: DepartmentUpdate) => {
  const response = await api.put(`/departments/${id}`, departmentData)
  return response.data
}

/**
 * Delete a department (admin only)
 */
export const deleteDepartment = async (id: number) => {
  const response = await api.delete(`/departments/${id}`)
  return response.data
}