import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBg?: string;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg = 'bg-primary/10', trend }) => {
  return (
    <Card className="flex items-start gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <div className={`w-12 h-12 rounded-btn flex items-center justify-center ${iconBg}`}>
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-500 font-heading">{title}</p>
        <h3 className="text-2xl font-heading font-bold text-gray-900">{value}</h3>
        {trend && <p className="text-xs text-success mt-1">{trend}</p>}
      </div>
    </Card>
  );
};
