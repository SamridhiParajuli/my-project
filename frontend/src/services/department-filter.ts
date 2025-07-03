// src/services/department-filter.ts
import { User } from '@/contexts/AuthContext'

/**
 * Helper class for applying department-based filters to API requests
 * Based on user role and department
 */
export class DepartmentFilter {
  /**
   * Apply department filtering to API request parameters
   * @param params Original API parameters
   * @param user Current user object
   * @returns Modified parameters with department filtering
   */
  static applyFilter<T extends Record<string, any>>(params: T, user: User | null): T {
    if (!user) return params;
    
    // Skip filtering for admins
    if (user.role === 'admin') {
      return params;
    }
    
    // For non-admins, if department_id is not explicitly set in params
    // and user has a department, filter by the user's department
    if (user.department_id && !params.department_id) {
      return {
        ...params,
        department_id: user.department_id
      };
    }
    
    // If a non-admin/manager is trying to access data from another department
    if (user.role !== 'manager' && params.department_id && params.department_id !== user.department_id) {
      // Force to user's department (for security)
      return {
        ...params,
        department_id: user.department_id
      };
    }
    
    return params;
  }
  
  /**
   * Check if the user has access to the given department
   * @param departmentId The department ID to check access for
   * @param user Current user object
   * @returns Boolean indicating whether user has access
   */
  static canAccessDepartment(departmentId: number | null | undefined, user: User | null): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager' && user.department_id === departmentId) return true;
    return user.department_id === departmentId;
  }
  
  /**
   * Filter an array of data by department
   * @param data Array of objects that contain department_id
   * @param user Current user object
   * @returns Filtered array based on user's department access
   */
  static filterDataByDepartment<T extends { department_id?: number | null }>(
    data: T[],
    user: User | null
  ): T[] {
    if (!user || user.role === 'admin') return data;
    
    // For non-admin users, filter to only show items from their department
    // or items with no department specified
    return data.filter(item => 
      !item.department_id || 
      item.department_id === user.department_id ||
      (user.role === 'manager' && item.department_id === user.department_id)
    );
  }
}

export default DepartmentFilter;