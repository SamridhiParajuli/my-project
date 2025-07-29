// src/components/common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="p-6 max-w-sm mx-auto bg-white rounded-md shadow-elegant">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-primary">{text}</h3>
            <p className="text-sm text-primary/60">Please wait while we load the data...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;