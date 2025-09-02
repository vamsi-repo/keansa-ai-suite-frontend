
import React from "react";
import { cn } from "@/lib/utils";
import { useValidation } from "@/contexts/ValidationContext";

export function StepNavigation() {
  const { currentStep, setCurrentStep, loading } = useValidation();
  
  const steps = [
    { number: 1, label: "Headers", description: "Select columns", color: "bg-blue-500", completedColor: "bg-blue-100 text-blue-800" },
    { number: 2, label: "Validate", description: "Set rules", color: "bg-green-500", completedColor: "bg-green-100 text-green-800" },
    { number: 3, label: "Correct", description: "Fix errors", color: "bg-amber-500", completedColor: "bg-amber-100 text-amber-800" },
    { number: 4, label: "Export", description: "Download & integrate", color: "bg-purple-500", completedColor: "bg-purple-100 text-purple-800" }
  ];

  const handleStepClick = (stepNumber: number) => {
    // Only allow going to previous steps or the current step
    if (stepNumber <= currentStep && !loading) {
      setCurrentStep(stepNumber);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between">
        {steps.map((step, idx) => (
          <React.Fragment key={step.number}>
            <button
              onClick={() => handleStepClick(step.number)}
              className={cn(
                "flex flex-col items-center relative group",
                "transition-colors duration-200",
                currentStep >= step.number ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              )}
              disabled={currentStep < step.number || loading}
            >
              <div className="flex items-center mb-2">
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center w-10 h-10 text-sm font-semibold transition-colors",
                    currentStep > step.number
                      ? step.completedColor
                      : currentStep === step.number
                      ? `${step.color} text-white`
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {currentStep > step.number ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
              </div>
              <div className="text-sm font-medium">{step.label}</div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </button>

            {/* Connector line between steps */}
            {idx < steps.length - 1 && (
              <div className="flex items-center flex-grow mx-4">
                <div 
                  className={cn(
                    "h-0.5 w-full",
                    currentStep > idx + 1 
                      ? steps[idx].color.replace("bg-", "bg-") // Use the same color as the step
                      : "bg-gray-200"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
