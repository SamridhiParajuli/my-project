// Path: src/components/users/UserProfileView.tsx
import React from 'react';
import { User } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Import icons if you have them, otherwise use simple SVG icons
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
    <path d="M9 22v-4h6v4"></path>
    <line x1="8" y1="6" x2="8" y2="6"></line>
    <line x1="16" y1="6" x2="16" y2="6"></line>
    <line x1="8" y1="10" x2="8" y2="10"></line>
    <line x1="16" y1="10" x2="16" y2="10"></line>
    <line x1="8" y1="14" x2="8" y2="14"></line>
    <line x1="16" y1="14" x2="16" y2="14"></line>
  </svg>
);

interface UserProfileViewProps {
  user: User;  // Using the User type from your AuthContext
  onEdit?: () => void;
}

const UserProfileView: React.FC<UserProfileViewProps> = ({ user, onEdit }) => {
  // Properly handle the User type conversion for display
  const displayUser = {
    id: String(user.id), // Convert number to string
    name: user.username, // Use username as name
    email: user.email || 'Not provided', 
    phone: '', // Not available in your User type
    department: user.department_id ? `Department ${user.department_id}` : undefined,
    role: user.role,
    joinDate: '', // Not available in your User type
    avatar: '' // Not available in your User type
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-24 h-24 rounded-full mb-4 bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-primary-dark uppercase text-3xl font-bold">
            {displayUser.name.charAt(0)}
          </div>
          
          <h2 className="text-2xl font-bold">{displayUser.name}</h2>
          
          <div className="mt-1 inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center p-3 rounded-md border border-secondary-dark/10 bg-secondary/5">
              <div className="text-accent mr-3">
                <MailIcon />
              </div>
              <div>
                <p className="text-xs text-primary/60">Email</p>
                <p className="text-sm font-medium">{displayUser.email}</p>
              </div>
            </div>
            
            {displayUser.phone && (
              <div className="flex items-center p-3 rounded-md border border-secondary-dark/10 bg-secondary/5">
                <div className="text-accent mr-3">
                  <PhoneIcon />
                </div>
                <div>
                  <p className="text-xs text-primary/60">Phone</p>
                  <p className="text-sm font-medium">{displayUser.phone}</p>
                </div>
              </div>
            )}
            
            {displayUser.department && (
              <div className="flex items-center p-3 rounded-md border border-secondary-dark/10 bg-secondary/5">
                <div className="text-accent mr-3">
                  <BuildingIcon />
                </div>
                <div>
                  <p className="text-xs text-primary/60">Department</p>
                  <p className="text-sm font-medium">{displayUser.department}</p>
                </div>
              </div>
            )}
            
            {/* Additional info sections as needed */}
          </div>
          
          {/* Status section */}
          <div className="flex items-center p-3 rounded-md border border-secondary-dark/10 bg-secondary/5">
            <div className="text-accent mr-3">
              <UserIcon />
            </div>
            <div>
              <p className="text-xs text-primary/60">Status</p>
              <p className="text-sm font-medium">
                {user.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
          
          {onEdit && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={onEdit}
                className="mr-2"
              >
                Edit Profile
              </Button>
              <Button variant="accent">
                Change Password
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileView;