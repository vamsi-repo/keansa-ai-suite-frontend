import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import * as apiService from '../services/api';
import { useToast } from '@/hooks/use-toast';

export interface Template {
  template_id: number;
  template_name: string;
  created_at: string;
  status: string;
}

interface ErrorLocation {
  row: number;
  value: string;
  rule_failed: string;
  reason: string;
}

interface ValidationContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  templates: Template[];
  setTemplates: (templates: Template[]) => void;
  loadTemplates: () => Promise<void>;
  uploadFile: (file: File) => Promise<any>;
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;
  headers: string[];
  setHeaders: (headers: string[]) => void;
  selectedHeaders: string[];
  setSelectedHeaders: (headers: string[]) => void;
  validations: Record<string, string[]>;
  setValidations: (validations: Record<string, string[]>) => void;
  errorLocations: Record<string, ErrorLocation[]>;
  setErrorLocations: (errors: Record<string, ErrorLocation[]>) => void;
  corrections: Record<string, Record<number, string>>;
  setCorrections: (corrections: Record<string, Record<number, string>>) => void;
  correctedFilePath: string;
  setCorrectedFilePath: (path: string) => void;
  dataRows: any[];
  setDataRows: (rows: any[]) => void;
  loading: boolean;
  resetValidationState: () => void;
  submitStep: (step: number, data?: any, action?: string) => Promise<any>;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [validations, setValidations] = useState<Record<string, string[]>>({});
  const [errorLocations, setErrorLocationsState] = useState<Record<string, ErrorLocation[]>>({});
  const [corrections, setCorrections] = useState<Record<string, Record<number, string>>>({});
  const [correctedFilePath, setCorrectedFilePath] = useState<string>('');
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Wrapper for setErrorLocations to add logging
  const setErrorLocations = (errors: Record<string, ErrorLocation[]>) => {
    console.log('ValidationContext: Setting errorLocations:', errors);
    setErrorLocationsState(errors);
  };

  // Wrapper for setDataRows to add logging
  const setDataRowsWithLog = (rows: any[]) => {
    console.log('ValidationContext: Setting dataRows:', rows);
    setDataRows(rows);
  };

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getTemplates();
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const uploadFile = async (file: File) => {
    setLoading(true);
    try {
      const response = await apiService.uploadFile(file);
      const sheetName = Object.keys(response.data.sheets)[0];
      setHeaders(response.data.sheets[sheetName].headers);
      return response.data;
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.response?.data?.message || "Failed to upload file",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetValidationState = () => {
    console.log('ValidationContext: Resetting validation state');
    setCurrentStep(1);
    setSelectedHeaders([]);
    setValidations({});
    setErrorLocations({});
    setCorrections({});
    setCorrectedFilePath('');
    setDataRows([]);
  };

  const submitStep = async (step: number, data?: any, action: string = 'save') => {
    setLoading(true);
    try {
      let response;

      switch (step) {
        case 1:
          response = await apiService.submitStepOne({
            headers: data?.headers || selectedHeaders,
            new_header_row: data?.new_header_row,
          });
          if (response.data.success) {
            setCurrentStep(2);
          }
          break;

        case 2:
          response = await apiService.submitStepTwo({
            validations: data?.validations || validations,
            action: action,
          });
          if (response.data.success) {
            if (action === 'save') {
              // Handle "Save" action in review mode
              toast({
                title: 'Success',
                description: 'Rules saved successfully',
                variant: 'default',
              });
            } else if (action === 'review') {
              // Handle "Review Configurations" action
              toast({
                title: 'Success',
                description: 'Validation rules saved. You can now review them.',
                variant: 'default',
              });
            }
          }
          break;

        case 4:
          response = await apiService.getStepData(4);
          break;

        default:
          throw new Error(`Invalid step: ${step}`);
      }

      return response.data;
    } catch (error: any) {
      toast({
        title: `Step ${step} Error`,
        description: error.response?.data?.message || `Failed to complete step ${step}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ValidationContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        templates,
        setTemplates,
        loadTemplates,
        uploadFile,
        selectedTemplate,
        setSelectedTemplate,
        headers,
        setHeaders,
        selectedHeaders,
        setSelectedHeaders,
        validations,
        setValidations,
        errorLocations,
        setErrorLocations,
        corrections,
        setCorrections,
        correctedFilePath,
        setCorrectedFilePath,
        dataRows,
        setDataRows: setDataRowsWithLog,
        loading,
        resetValidationState,
        submitStep,
      }}
    >
      {children}
    </ValidationContext.Provider>
  );
};

export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (context === undefined) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};