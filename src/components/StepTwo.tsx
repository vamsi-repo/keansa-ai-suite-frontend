
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useValidation } from "@/contexts/ValidationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// Available validation rules
const validationRules = [
  { id: "Required", label: "Required", description: "Field cannot be empty" },
  { id: "Numeric", label: "Numeric", description: "Only numbers allowed" },
  { id: "Email", label: "Email", description: "Must be a valid email format" },
  { id: "Date", label: "Date", description: "Must be a valid date format (e.g., DD-MM-YYYY)" },
  { id: "Text", label: "Text", description: "Allow text with quotes and parentheses" }
];

export function StepTwo() {
  const { 
    selectedHeaders, 
    validations, 
    setValidations, 
    setCurrentStep,
    submitStep,
    loading
  } = useValidation();
  const [activeTab, setActiveTab] = useState<string>(selectedHeaders[0] || "");

  // Toggle a validation rule for a header
  const toggleRule = (header: string, ruleId: string) => {
    const headerValidations = validations[header] || [];
    
    if (headerValidations.includes(ruleId)) {
      setValidations({
        ...validations,
        [header]: headerValidations.filter(id => id !== ruleId)
      });
    } else {
      setValidations({
        ...validations,
        [header]: [...headerValidations, ruleId]
      });
    }
  };

  const handleNext = async () => {
    // Check if at least one validation rule is applied to each header
    const missingValidations = selectedHeaders.filter(
      header => !validations[header] || validations[header].length === 0
    );
    
    if (missingValidations.length > 0) {
      toast({
        title: "Validation rules required",
        description: `Please apply at least one validation rule to: ${missingValidations.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      await submitStep(2, { validations });
    } catch (error) {
      console.error("Failed to process step 2:", error);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Step 2: Apply Validations</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 w-full flex flex-wrap">
            {selectedHeaders.map((header) => (
              <TabsTrigger 
                key={header} 
                value={header}
                className="flex-grow"
              >
                {header}
                {validations[header]?.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {validations[header].length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {selectedHeaders.map((header) => (
            <TabsContent key={header} value={header} className="pt-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Validation Rules for "{header}"</h3>
                  <p className="text-sm text-gray-500">
                    Select the validation rules to apply to this column
                  </p>
                </div>
                
                <div className="divide-y border rounded-md">
                  {validationRules.map((rule) => (
                    <div key={rule.id} className="p-3 flex items-center hover:bg-gray-50">
                      <Checkbox
                        id={`${header}-${rule.id}`}
                        checked={(validations[header] || []).includes(rule.id)}
                        onCheckedChange={() => toggleRule(header, rule.id)}
                      />
                      <div className="ml-3">
                        <Label 
                          htmlFor={`${header}-${rule.id}`}
                          className="font-medium block cursor-pointer"
                        >
                          {rule.label}
                        </Label>
                        <p className="text-sm text-gray-500">{rule.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={loading}
        >
          Back
        </Button>
        <Button 
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? "Processing..." : "Next: Correct Errors"}
        </Button>
      </CardFooter>
    </Card>
  );
}
