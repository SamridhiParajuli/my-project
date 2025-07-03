// src/types/index.ts (COMPLETE FILE)
export interface User {
  id: number;
  username: string;
  user_type: string;
  department_id: number | null;
  employee_id: number | null;
  role: string;
  is_active: boolean;
}

export interface UserCreate {
  username: string;
  password: string;
  user_type: string;
  department_id?: number; // Optional but never null for API
  employee_id?: number; // Optional but never null for API
  role: string;
  is_active: boolean;
}

export interface UserFormData {
  username: string;
  password: string;
  user_type: string;
  department_id: number | null;
  employee_id: number | null;
  role: string;
  is_active: boolean;
}

export interface Department {
  id: number;
  name: string;
  manager_id: number | null;
}

export interface DepartmentCreate {
  name: string;
  manager_id?: number; // Optional but never null for API
}

export interface DepartmentFormData {
  name: string;
  manager_id: number | null;
}

export interface Employee {
  id: number;
  name: string;
  employee_id: string;
  department_id: number | null;
  position: string;
}

export interface EmployeeCreate {
  name: string;
  employee_id: string;
  department_id?: number; // Optional but never null for API
  position: string;
}

export interface EmployeeFormData {
  name: string;
  employee_id: string;
  department_id: number | null;
  position: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface RolePermission {
  role: string;
  permissions: string[];
}

// For tasks, announcements, etc.
export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: number | null;
  created_by: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}