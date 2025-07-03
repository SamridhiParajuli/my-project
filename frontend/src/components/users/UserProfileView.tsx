// src/components/dashboard/UserProfileView.tsx (COMPLETE FILE)
import React from 'react';
import { User } from '@/types';

export interface UserProfileViewProps {
  user: User;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ user }) => {
  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Username:</span> {user.username}
        </div>
        <div>
          <span className="font-medium">User Type:</span> {user.user_type}
        </div>
        <div>
          <span className="font-medium">Role:</span> {user.role}
        </div>
        <div>
          <span className="font-medium">Status:</span>{' '}
          <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;