// src/services/employees.ts
import api from './api'
import { Employee } from '@/types'

export interface EmployeeCreate {
  employee_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  department_id?: number
  position?: string
  status?: string
  hire_date?: string
}

export interface EmployeeUpdate {
  employee_id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  department_id?: number
  position?: string
  status?: string
  hire_date?: string
}

export interface EmployeesParams {
  skip?: number
  limit?: number
  department_id?: number
  status?: string
  position?: string
  sort?: string
  order?: string
  search?: string
}

/**
 * Get all employees with optional filters
 */
export const getEmployees = async (params: EmployeesParams = {}) => {
  const response = await api.get('/employees', { params })
  return response.data
}

/**
 * Get a single employee by ID
 */
export const getEmployee = async (id: number) => {
  const response = await api.get(`/employees/${id}`)
  return response.data
}

/**
 * Create a new employee
 */
export const createEmployee = async (employeeData: EmployeeCreate) => {
  const response = await api.post('/employees', employeeData)
  return response.data
}

/**
 * Update an existing employee
 */
export const updateEmployee = async (id: number, employeeData: EmployeeUpdate) => {
  const response = await api.put(`/employees/${id}`, employeeData)
  return response.data
}

/**
 * Delete an employee (admin only)
 */
export const deleteEmployee = async (id: number) => {
  const response = await api.delete(`/employees/${id}`)
  return response.data
}