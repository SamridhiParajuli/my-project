// src/app/(dashboard)/users/page.tsx (COMPLETE FILE)
'use client';

import { useState, useEffect } from 'react';
import { User, UserFormData, Department, Employee } from '@/types';

// Mock data and functions (replace with actual API calls)
const mockUsers: User[] = [
  { id: 1, username: 'admin', user_type: 'admin', department_id: null, employee_id: null, role: 'admin', is_active: true },
  { id: 2, username: 'manager1', user_type: 'manager', department_id: 1, employee_id: 1, role: 'manager', is_active: true },
  { id: 3, username: 'staff1', user_type: 'staff', department_id: 2, employee_id: 2, role: 'staff', is_active: true },
];

const mockDepartments: Department[] = [
  { id: 1, name: 'Produce', manager_id: 1 },
  { id: 2, name: 'Grocery', manager_id: 2 },
  { id: 3, name: 'Meat', manager_id: null },
];

const mockEmployees: Employee[] = [
  { id: 1, name: 'John Doe', employee_id: 'EMP001', department_id: 1, position: 'Manager' },
  { id: 2, name: 'Jane Smith', employee_id: 'EMP002', department_id: 2, position: 'Clerk' },
];

async function getUsers(): Promise<User[]> {
  // Replace with actual API call
  return Promise.resolve(mockUsers);
}

async function getDepartments(): Promise<Department[]> {
  // Replace with actual API call
  return Promise.resolve(mockDepartments);
}

async function getEmployees(): Promise<Employee[]> {
  // Replace with actual API call
  return Promise.resolve(mockEmployees);
}

async function createUser(data: {
  username: string;
  password: string;
  user_type: string;
  role: string;
  is_active: boolean;
  department_id?: number;
  employee_id?: number;
}): Promise<User> {
  // Replace with actual API call
  const newUser: User = {
    id: mockUsers.length + 1,
    username: data.username,
    user_type: data.user_type,
    department_id: data.department_id || null,
    employee_id: data.employee_id || null,
    role: data.role,
    is_active: data.is_active
  };
  return Promise.resolve(newUser);
}

async function updateUser(id: number, data: {
  username: string;
  password?: string;
  user_type: string;
  role: string;
  is_active: boolean;
  department_id?: number;
  employee_id?: number;
}): Promise<User> {
  // Replace with actual API call
  const updatedUser: User = {
    id,
    username: data.username,
    user_type: data.user_type,
    department_id: data.department_id || null,
    employee_id: data.employee_id || null,
    role: data.role,
    is_active: data.is_active
  };
  return Promise.resolve(updatedUser);
}

async function deleteUser(id: number): Promise<void> {
  // Replace with actual API call
  return Promise.resolve();
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    user_type: 'staff',
    department_id: null,
    employee_id: null,
    role: 'staff',
    is_active: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, departmentsData, employeesData] = await Promise.all([
          getUsers(),
          getDepartments(),
          getEmployees()
        ]);
        setUsers(usersData);
        setDepartments(departmentsData);
        setEmployees(employeesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: ['department_id', 'employee_id'].includes(name)
          ? value ? parseInt(value) : null
          : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create API-compatible object from form data
      const apiData = {
        username: formData.username,
        password: formData.password,
        user_type: formData.user_type,
        role: formData.role,
        is_active: formData.is_active,
        // Only include optional fields if they're not null
        ...(formData.department_id !== null && { department_id: formData.department_id }),
        ...(formData.employee_id !== null && { employee_id: formData.employee_id }),
      };

      if (editingId) {
        // For update, we can omit the password if it's empty
        if (!apiData.password) {
          const { password, ...dataWithoutPassword } = apiData;
          await updateUser(editingId, dataWithoutPassword);
        } else {
          await updateUser(editingId, apiData);
        }
      } else {
        await createUser(apiData);
      }
      
      // Refresh users list
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
      
      // Reset form
      setFormData({
        username: '',
        password: '',
        user_type: 'staff',
        department_id: null,
        employee_id: null,
        role: 'staff',
        is_active: true,
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      password: '', // Don't include password when editing
      user_type: user.user_type,
      department_id: user.department_id,
      employee_id: user.employee_id,
      role: user.role,
      is_active: user.is_active,
    });
    setEditingId(user.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        setUsers(users.filter(user => user.id !== id));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-white rounded shadow">
        <h2 className="text-xl mb-4">{editingId ? 'Edit User' : 'Add User'}</h2>
        
        <div className="mb-4">
          <label className="block mb-1">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-1">
            {editingId ? 'New Password (leave blank to keep current)' : 'Password'}
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required={!editingId}
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-1">User Type</label>
          <select
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-1">Department</label>
          <select
            name="department_id"
            value={formData.department_id === null ? '' : formData.department_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">No Department</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-1">Employee</label>
          <select
            name="employee_id"
            value={formData.employee_id === null ? '' : formData.employee_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">No Employee</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.employee_id})
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block mb-1">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="dairy_lead">Dairy Lead</option>
            <option value="bulk_lead">Bulk Lead</option>
          </select>
        </div>
        
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="mr-2"
          />
          <label htmlFor="is_active">Active User</label>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            {editingId ? 'Update' : 'Add'} User
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  username: '',
                  password: '',
                  user_type: 'staff',
                  department_id: null,
                  employee_id: null,
                  role: 'staff',
                  is_active: true,
                });
                setEditingId(null);
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 text-left">ID</th>
              <th className="py-2 px-4 text-left">Username</th>
              <th className="py-2 px-4 text-left">Type</th>
              <th className="py-2 px-4 text-left">Department</th>
              <th className="py-2 px-4 text-left">Employee</th>
              <th className="py-2 px-4 text-left">Role</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="py-2 px-4">{user.id}</td>
                <td className="py-2 px-4">{user.username}</td>
                <td className="py-2 px-4">{user.user_type}</td>
                <td className="py-2 px-4">
                  {user.department_id 
                    ? departments.find(d => d.id === user.department_id)?.name || 'Unknown' 
                    : 'None'}
                </td>
                <td className="py-2 px-4">
                  {user.employee_id 
                    ? employees.find(e => e.id === user.employee_id)?.name || 'Unknown' 
                    : 'None'}
                </td>
                <td className="py-2 px-4">{user.role}</td>
                <td className="py-2 px-4">
                  <span className={`px-2 py-1 rounded ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleEdit(user)}
                    className="mr-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}