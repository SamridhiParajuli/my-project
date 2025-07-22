'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserProfileView from '@/components/users/UserProfileView';
import { Card, CardContent } from '@/components/ui/Card';

export default function ProfilePage() {
  const { user, employee, department, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-medium mb-2">Not Logged In</h2>
            <p className="text-gray-600">You need to be logged in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the full name from employee if available
  const getFullName = () => {
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    return user.username;
  };

  // Now user from useAuth() is passed directly to UserProfileView
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <UserProfileView user={user} />
    </div>
  );
}