import React from 'react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className={`flex items-center gap-2 ${i <= currentStep ? 'text-primary' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-heading font-bold ${
              i < currentStep ? 'bg-primary text-white' : i === currentStep ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
            }`}>{i + 1}</div>
            <span className="text-sm font-heading font-semibold hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-gray-100'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};
