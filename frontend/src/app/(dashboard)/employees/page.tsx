// src/app/(dashboard)/employees/page.tsx (COMPLETE FILE)
'use client';

import { useState, useEffect } from 'react';
import { Employee, EmployeeFormData, Department } from '@/types';

// Mock data and functions (replace with actual API calls)
const mockEmployees: Employee[] = [
  { id: 1, name: 'John Doe', employee_id: 'EMP001', department_id: 1, position: 'Clerk' },
  { id: 2, name: 'Jane Smith', employee_id: 'EMP002', department_id: 2, position: 'Supervisor' },
];

const mockDepartments: Department[] = [
  { id: 1, name: 'Produce', manager_id: 1 },
  { id: 2, name: 'Grocery', manager_id: 2 },
  { id: 3, name: 'Meat', manager_id: null },
];

async function getEmployees(): Promise<Employee[]> {
  // Replace with actual API call
  return Promise.resolve(mockEmployees);
}

async function getDepartments(): Promise<Department[]> {
  // Replace with actual API call
  return Promise.resolve(mockDepartments);
}

async function createEmployee(data: { 
  name: string; 
  employee_id: string; 
  position: string;
  department_id?: number; 
}): Promise<Employee> {
  // Replace with actual API call
  const newEmployee: Employee = { 
    id: mockEmployees.length + 1, 
    name: data.name, 
    employee_id: data.employee_id,
    department_id: data.department_id || null,
    position: data.position
  };
  return Promise.resolve(newEmployee);
}

async function updateEmployee(id: number, data: { 
  name: string; 
  employee_id: string; 
  position: string;
  department_id?: number; 
}): Promise<Employee> {
  // Replace with actual API call
  const updatedEmployee: Employee = { 
    id, 
    name: data.name, 
    employee_id: data.employee_id,
    department_id: data.department_id || null,
    position: data.position
  };
  return Promise.resolve(updatedEmployee);
}

async function deleteEmployee(id: number): Promise<void> {
  // Replace with actual API call
  return Promise.resolve();
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    employee_id: '',
    department_id: null,
    position: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesData, departmentsData] = await Promise.all([
          getEmployees(),
          getDepartments()
        ]);
        setEmployees(employeesData);
        setDepartments(departmentsData);
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
      [name]: name === 'department_id' ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create API-compatible object from form data
      const apiData = {
        name: formData.name,
        employee_id: formData.employee_id,
        position: formData.position,
        // Only include department_id if it's not null
        ...(formData.department_id !== null && { department_id: formData.department_id }),
      };

      if (editingId) {
        await updateEmployee(editingId, apiData);
      } else {
        await createEmployee(apiData);
      }
      
      // Refresh employees list
      const updatedEmployees = await getEmployees();
      setEmployees(updatedEmployees);
      
      // Reset form
      setFormData({ 
        name: '', 
        employee_id: '', 
        department_id: null, 
        position: '' 
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      employee_id: employee.employee_id,
      department_id: employee.department_id,
      position: employee.position,
    });
    setEditingId(employee.id);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id);
        setEmployees(employees.filter(emp => emp.id !== id));
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Employees</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-white rounded shadow">
        <h2 className="text-xl mb-4">{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
        
        <div className="mb-4">
          <label className="block mb-1">Name</label>
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
          <label className="block mb-1">Employee ID</label>
          <input
            type="text"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
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
          <label className="block mb-1">Position</label>
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            {editingId ? 'Update' : 'Add'} Employee
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setFormData({ 
                  name: '', 
                  employee_id: '', 
                  department_id: null, 
                  position: '' 
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
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">Employee ID</th>
              <th className="py-2 px-4 text-left">Department</th>
              <th className="py-2 px-4 text-left">Position</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className="border-t">
                <td className="py-2 px-4">{employee.id}</td>
                <td className="py-2 px-4">{employee.name}</td>
                <td className="py-2 px-4">{employee.employee_id}</td>
                <td className="py-2 px-4">
                  {employee.department_id 
                    ? departments.find(d => d.id === employee.department_id)?.name || 'Unknown' 
                    : 'None'}
                </td>
                <td className="py-2 px-4">{employee.position}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleEdit(employee)}
                    className="mr-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id)}
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