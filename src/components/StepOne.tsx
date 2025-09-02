
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useValidation } from "@/contexts/ValidationContext";
import { Label } from "@/components/ui/label";

export function StepOne() {
  const navigate = useNavigate();
  const {
    headers,
    selectedHeaders,
    setSelectedHeaders,
    submitStep,
    loading
  } = useValidation();
  const [customHeaderRow, setCustomHeaderRow] = useState("");

  const toggleHeader = (header: string) => {
    if (selectedHeaders.includes(header)) {
      setSelectedHeaders(selectedHeaders.filter((h) => h !== header));
    } else {
      setSelectedHeaders([...selectedHeaders, header]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedHeaders.length === headers.length) {
      setSelectedHeaders([]);
    } else {
      setSelectedHeaders([...headers]);
    }
  };

  const handleNext = async () => {
    if (selectedHeaders.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one header",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitStep(1, {
        headers: selectedHeaders,
        new_header_row: customHeaderRow || undefined
      });
    } catch (error) {
      // Error handling is done in the context
      console.error("Failed to process step 1:", error);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  const handleChangeHeaderRow = async () => {
    if (!customHeaderRow) {
      toast({
        title: "Input required",
        description: "Please enter a row number",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await submitStep(1, {
        headers: [],
        new_header_row: customHeaderRow
      });
      
      if (response.headers) {
        toast({
          title: "Headers updated",
          description: "Header row has been updated successfully",
        });
      }
    } catch (error) {
      console.error("Failed to update header row:", error);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Step 1: Select Headers</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block">Header Row Selection</Label>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Enter header row number"
                value={customHeaderRow}
                onChange={(e) => setCustomHeaderRow(e.target.value)}
              />
              <Button 
                variant="outline" 
                onClick={handleChangeHeaderRow}
                disabled={loading}
              >
                Change Header Row
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              If the detected headers are incorrect, specify the row number containing headers
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Available Headers</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSelectAll}
                disabled={loading}
              >
                {selectedHeaders.length === headers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="border rounded-md divide-y">
              {headers.map((header, index) => (
                <div 
                  key={index} 
                  className="flex items-center p-3 hover:bg-gray-50"
                >
                  <Checkbox
                    id={`header-${index}`}
                    checked={selectedHeaders.includes(header)}
                    onCheckedChange={() => toggleHeader(header)}
                  />
                  <label 
                    htmlFor={`header-${index}`}
                    className="ml-3 cursor-pointer flex-grow"
                  >
                    {header || `<Empty Header ${index + 1}>`}
                  </label>
                </div>
              ))}
              
              {headers.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No headers available. Try changing the header row.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleNext}
          disabled={selectedHeaders.length === 0 || loading}
        >
          {loading ? "Processing..." : "Next: Apply Validations"}
        </Button>
      </CardFooter>
    </Card>
  );
}
