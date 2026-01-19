import React from 'react';
import { PrivacyCoaching } from '../PrivacyCoaching';

interface PrivacyCoachDashboardProps {
  className?: string;
}

export const PrivacyCoachDashboard: React.FC<PrivacyCoachDashboardProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={className}>
      <PrivacyCoaching />
    </div>
  );
};
