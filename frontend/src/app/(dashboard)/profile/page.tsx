// src/app/(dashboard)/profile/page.tsx (COMPLETE FILE)
'use client';

import { useEffect, useState } from 'react';
import { User } from '@/types';
import UserProfileView from '@/components/users/UserProfileView';

// Mock data and functions (replace with actual API calls)
const mockUser: User = {
  id: 1,
  username: 'admin',
  user_type: 'admin',
  department_id: null,
  employee_id: null,
  role: 'admin',
  is_active: true
};

async function getUserProfile(): Promise<User> {
  // Replace with actual API call
  return Promise.resolve(mockUser);
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUserProfile();
        // Ensure is_active is always a boolean to match the User type
        setUser({
          ...userData,
          is_active: userData.is_active === undefined ? true : userData.is_active
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Unable to load profile</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <UserProfileView user={user} />
    </div>
  );
}