// src/app/(dashboard)/permissions/page.tsx (COMPLETE FILE)
'use client';

import { useState, useEffect } from 'react';
import { Permission, RolePermission } from '@/types';

// Mock data and functions (replace with actual API calls)
const mockPermissions: Permission[] = [
  { id: 1, name: 'create_user', description: 'Create new users' },
  { id: 2, name: 'edit_user', description: 'Edit existing users' },
  { id: 3, name: 'delete_user', description: 'Delete users' },
  { id: 4, name: 'create_department', description: 'Create new departments' },
  { id: 5, name: 'edit_department', description: 'Edit existing departments' },
  { id: 6, name: 'delete_department', description: 'Delete departments' },
  { id: 7, name: 'create_employee', description: 'Create new employees' },
  { id: 8, name: 'edit_employee', description: 'Edit existing employees' },
  { id: 9, name: 'delete_employee', description: 'Delete employees' },
];

const mockRolePermissions: RolePermission[] = [
  { role: 'admin', permissions: ['create_user', 'edit_user', 'delete_user', 'create_department', 'edit_department', 'delete_department', 'create_employee', 'edit_employee', 'delete_employee'] },
  { role: 'manager', permissions: ['create_employee', 'edit_employee', 'delete_employee'] },
  { role: 'staff', permissions: [] },
];

async function getPermissions(): Promise<Permission[]> {
  // Replace with actual API call
  return Promise.resolve(mockPermissions);
}

async function getRolePermissions(): Promise<RolePermission[]> {
  // Replace with actual API call
  return Promise.resolve(mockRolePermissions);
}

async function updateRolePermissions(role: string, permissions: string[]): Promise<void> {
  // Replace with actual API call
  console.log(`Updated permissions for ${role}:`, permissions);
  return Promise.resolve();
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<string[]>(['admin', 'manager', 'staff', 'dairy_lead', 'bulk_lead']); 
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [permissionsData, rolePermissionsData] = await Promise.all([
          getPermissions(),
          getRolePermissions()
        ]);
        setPermissions(permissionsData);
        setRolePermissions(rolePermissionsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching permissions data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value);
  };

  const handlePermissionToggle = (e: React.ChangeEvent<HTMLInputElement>, permissionName: string) => {
    // Properly type-cast e.target as HTMLInputElement to access checked property
    const target = e.target as HTMLInputElement;
    const isChecked = target.checked;
    
    setRolePermissions(prev => {
      // Find current role permissions
      const currentRolePermissions = prev.find(rp => rp.role === selectedRole);
      
      if (currentRolePermissions) {
        // Update existing role permissions
        return prev.map(rp => {
          if (rp.role === selectedRole) {
            return {
              ...rp,
              permissions: isChecked
                ? [...rp.permissions, permissionName]
                : rp.permissions.filter(p => p !== permissionName)
            };
          }
          return rp;
        });
      } else {
        // Create new role permissions entry
        return [
          ...prev,
          {
            role: selectedRole,
            permissions: isChecked ? [permissionName] : []
          }
        ];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rolePermission = rolePermissions.find(rp => rp.role === selectedRole);
      
      if (rolePermission) {
        await updateRolePermissions(selectedRole, rolePermission.permissions);
        alert('Permissions updated successfully');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const isPermissionEnabled = (permissionName: string) => {
    const rolePermission = rolePermissions.find(rp => rp.role === selectedRole);
    return rolePermission?.permissions.includes(permissionName) || false;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Role Permissions</h1>
      
      <div className="mb-4">
        <label className="block mb-1">Select Role:</label>
        <select
          value={selectedRole}
          onChange={handleRoleChange}
          className="w-64 p-2 border rounded"
        >
          {roles.map(role => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4">
        <h2 className="text-xl mb-4">
          Permissions for {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).replace('_', ' ')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {permissions.map(permission => (
            <div key={permission.id} className="flex items-center">
              <input
                type="checkbox"
                id={`permission-${permission.id}`}
                checked={isPermissionEnabled(permission.name)}
                onChange={(e) => handlePermissionToggle(e, permission.name)}
                className="mr-2"
              />
              <label htmlFor={`permission-${permission.id}`} className="flex flex-col">
                <span className="font-medium">{permission.name.replace('_', ' ')}</span>
                <span className="text-sm text-gray-600">{permission.description}</span>
              </label>
            </div>
          ))}
        </div>
        
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Save Permissions
        </button>
      </form>
    </div>
  );
}