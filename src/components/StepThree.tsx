
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useValidation } from "@/contexts/ValidationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export function StepThree() {
  const { 
    selectedHeaders,
    errorLocations,
    corrections,
    setCorrections,
    setCurrentStep,
    dataRows,
    submitStep,
    loading
  } = useValidation();
  const [activeTab, setActiveTab] = useState<string>(
    // Find first column with errors, or default to first column
    Object.keys(errorLocations).length > 0
      ? Object.keys(errorLocations)[0]
      : selectedHeaders[0] || ""
  );

  // Total number of errors across all columns
  const totalErrors = Object.values(errorLocations).reduce(
    (sum, columnErrors) => sum + columnErrors.length,
    0
  );

  // Count of errors per column
  const errorCounts = Object.fromEntries(
    Object.entries(errorLocations).map(([header, errors]) => [header, errors.length])
  );

  const handleCorrectionChange = (header: string, rowIndex: number, value: string) => {
    setCorrections({
      ...corrections,
      [header]: {
        ...(corrections[header] || {}),
        [rowIndex]: value
      }
    });
  };

  const handleNext = async () => {
    if (totalErrors > 0) {
      // Check if all errors have corrections
      let allCorrected = true;
      
      for (const [header, errors] of Object.entries(errorLocations)) {
        for (const [rowIndex] of errors) {
          if (!corrections[header] || !corrections[header][rowIndex]) {
            allCorrected = false;
            break;
          }
        }
        if (!allCorrected) break;
      }
      
      if (!allCorrected) {
        toast({
          title: "Uncorrected errors",
          description: "Please correct all errors before proceeding",
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      await submitStep(3, { corrections });
    } catch (error) {
      console.error("Failed to process step 3:", error);
    }
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Step 3: Correct Errors</CardTitle>
          {totalErrors > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {totalErrors} {totalErrors === 1 ? "Error" : "Errors"} Found
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {totalErrors === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 text-green-500 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No Errors Found!</h3>
            <p className="text-gray-500">
              Your data passed all validation checks. You can proceed to download the validated file.
            </p>
          </div>
        ) : (
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4 w-full flex flex-wrap">
              {Object.keys(errorLocations).map((header) => (
                <TabsTrigger 
                  key={header} 
                  value={header}
                  className="flex-grow"
                >
                  {header}
                  {errorCounts[header] > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-100 text-red-800 text-xs rounded-full">
                      {errorCounts[header]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.keys(errorLocations).map((header) => (
              <TabsContent key={header} value={header} className="space-y-4">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">
                        {errorCounts[header]} errors found in column "{header}"
                      </h3>
                      <div className="mt-2 text-sm text-amber-700">
                        <p>Please correct the values below.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md divide-y">
                  {errorLocations[header].map(([rowIndex, originalValue]) => {
                    // Find the row data to show context
                    const rowData = dataRows[rowIndex - 1] || {};
                    
                    return (
                      <div key={`${header}-${rowIndex}`} className="p-4">
                        <div className="flex justify-between mb-2">
                          <div className="font-medium text-red-700">
                            Error in Row {rowIndex}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <span className="text-sm font-medium text-gray-700 block mb-1">Original Value:</span>
                            <div className="p-2 bg-red-50 border border-red-200 rounded">
                              {originalValue === "NULL" ? <em className="text-gray-500">NULL</em> : 
                               originalValue === "EMPTY" ? <em className="text-gray-500">EMPTY</em> : 
                               originalValue}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 block mb-1">Correction:</span>
                            <Input
                              value={(corrections[header]?.[rowIndex]) || ""}
                              onChange={(e) => handleCorrectionChange(header, rowIndex, e.target.value)}
                              placeholder="Enter corrected value"
                              className="border-blue-300"
                            />
                          </div>
                        </div>
                        
                        {/* Show context data from other columns */}
                        <div className="bg-gray-50 p-3 rounded-md mt-2">
                          <span className="text-sm font-medium text-gray-700 block mb-2">Row Context:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(rowData)
                              .filter(([key]) => key !== header)
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <div key={key} className="flex items-center">
                                  <span className="font-medium text-gray-600 mr-2">{key}:</span>
                                  <span>{value as string}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
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
          {loading ? "Processing..." : "Next: Export Data"}
        </Button>
      </CardFooter>
    </Card>
  );
}
