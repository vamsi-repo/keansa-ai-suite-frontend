
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useValidation } from "@/contexts/ValidationContext";
import { useNavigate } from "react-router-dom";
import { Download, FileCheck, ArrowLeft, Plus } from "lucide-react";
import * as apiService from "@/services/api";

export function StepFour() {
  const navigate = useNavigate();
  const { 
    correctedFilePath,
    setCurrentStep,
    resetValidationState,
    selectedTemplate
  } = useValidation();

  const handleDownload = () => {
    apiService.downloadFile(correctedFilePath);
  };

  const handleBack = () => {
    setCurrentStep(3);
  };

  const handleStartNew = () => {
    resetValidationState();
    navigate("/dashboard");
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardTitle>Step 4: Export Corrected Data</CardTitle>
      </CardHeader>
      
      <CardContent className="text-center py-8">
        <div className="mx-auto w-20 h-20 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center mb-6">
          <FileCheck className="h-12 w-12" />
        </div>
        
        <h3 className="text-2xl font-bold mb-3">Validation Complete!</h3>
        
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Your file has been validated and all errors have been corrected. 
          You can now download the corrected file.
        </p>
        
        <div className="bg-gray-50 border border-purple-200 rounded-md p-4 mb-6 max-w-md mx-auto">
          <div className="font-medium text-gray-700 mb-1">Corrected File:</div>
          <div className="text-gray-800 break-all">{correctedFilePath}</div>
        </div>
        
        <Button 
          size="lg"
          onClick={handleDownload}
          className="mb-4 bg-purple-600 hover:bg-purple-700"
        >
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
        
        <p className="text-sm text-gray-500 mb-6">
          The file will be downloaded to your computer
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
          <Button 
            variant="outline"
            onClick={() => navigate(`/validate/${selectedTemplate?.template_id}?step=2`)}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More Validations
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            Upload New File
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="border-purple-200 text-purple-700 hover:bg-purple-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          variant="secondary"
          onClick={handleStartNew}
          className="bg-green-100 text-green-800 hover:bg-green-200"
        >
          Start New Validation
        </Button>
      </CardFooter>
    </Card>
  );
}
