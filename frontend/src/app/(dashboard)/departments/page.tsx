// src/app/(dashboard)/departments/page.tsx (COMPLETE FILE)
'use client';

import { useState, useEffect } from 'react';
import { Department, DepartmentFormData, User } from '@/types';

// Mock data and functions (replace with actual API calls)
const mockDepartments: Department[] = [
  { id: 1, name: 'Produce', manager_id: 1 },
  { id: 2, name: 'Grocery', manager_id: 2 },
  { id: 3, name: 'Meat', manager_id: null },
];

const mockUsers: User[] = [
  { id: 1, username: 'manager1', user_type: 'manager', department_id: 1, employee_id: 1, role: 'manager', is_active: true },
  { id: 2, username: 'manager2', user_type: 'manager', department_id: 2, employee_id: 2, role: 'manager', is_active: true },
];

async function getDepartments(): Promise<Department[]> {
  // Replace with actual API call
  return Promise.resolve(mockDepartments);
}

async function getUsers(): Promise<User[]> {
  // Replace with actual API call
  return Promise.resolve(mockUsers);
}

async function createDepartment(data: { name: string; manager_id?: number }): Promise<Department> {
  // Replace with actual API call
  const newDept: Department = { 
    id: mockDepartments.length + 1, 
    name: data.name, 
    manager_id: data.manager_id || null 
  };
  return Promise.resolve(newDept);
}

async function updateDepartment(id: number, data: { name: string; manager_id?: number }): Promise<Department> {
  // Replace with actual API call
  const updatedDept: Department = { 
    id, 
    name: data.name, 
    manager_id: data.manager_id || null 
  };
  return Promise.resolve(updatedDept);
}

async function deleteDepartment(id: number): Promise<void> {
  // Replace with actual API call
  return Promise.resolve();
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    manager_id: null,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentsData, usersData] = await Promise.all([
          getDepartments(),
          getUsers()
        ]);
        setDepartments(departmentsData);
        // Filter users who can be managers (e.g., user_type === 'manager' or 'admin')
        setManagers(usersData.filter(user => ['admin', 'manager'].includes(user.user_type)));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'manager_id' ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create API-compatible object from form data
      const apiData = {
        name: formData.name,
        // Only include manager_id if it's not null
        ...(formData.manager_id !== null && { manager_id: formData.manager_id }),
      };

      if (editingId) {
        await updateDepartment(editingId, apiData);
      } else {
        await createDepartment(apiData);
      }
      
      // Refresh departments list
      const updatedDepartments = await getDepartments();
      setDepartments(updatedDepartments);
      
      // Reset form
      setFormData({ name: '', manager_id: null });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving department:', error);
    }
  };

  const handleEdit = (department: Department) => {
    setFormData({
      name: department.name,
      manager_id: department.manager_id,
    });
    setEditingId(department.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteDepartment(id);
        setDepartments(departments.filter(dept => dept.id !== id));
      } catch (error) {
        console.error('Error deleting department:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Departments</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-white rounded shadow">
        <h2 className="text-xl mb-4">{editingId ? 'Edit Department' : 'Add Department'}</h2>
        
        <div className="mb-4">
          <label className="block mb-1">Department Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-1">Department Manager</label>
          <select
            name="manager_id"
            value={formData.manager_id === null ? '' : formData.manager_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">No Manager</option>
            {managers.map(manager => (
              <option key={manager.id} value={manager.id}>
                {manager.username}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            {editingId ? 'Update' : 'Add'} Department
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setFormData({ name: '', manager_id: null });
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
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">Manager</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(department => (
              <tr key={department.id} className="border-t">
                <td className="py-2 px-4">{department.id}</td>
                <td className="py-2 px-4">{department.name}</td>
                <td className="py-2 px-4">
                  {department.manager_id 
                    ? managers.find(m => m.id === department.manager_id)?.username || 'Unknown' 
                    : 'None'}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleEdit(department)}
                    className="mr-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(department.id)}
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