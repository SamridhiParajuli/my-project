// Path: src/components/auth/RoleProtectedRoute.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && (!user || !allowedRoles.includes(user.role))) {
      router.push('/login');
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="p-6 max-w-sm mx-auto bg-white rounded-md shadow-elegant">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-primary">Authenticating</h3>
              <p className="text-sm text-primary/60">Please wait while we verify your credentials...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;