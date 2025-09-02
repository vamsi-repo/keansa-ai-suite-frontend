import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Home, Download, ArrowLeft } from 'lucide-react';
import { useValidation } from '@/contexts/ValidationContext';
import { toast } from '@/hooks/use-toast';
import * as apiService from '@/services/api';
import { Sidebar } from '@/components/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

// Define TypeScript interfaces
interface TemplateResponse {
  sheets: {
    [key: string]: {
      headers: string[];
    };
  };
  file_name: string;
  file_path: string;
  sheet_name: string;
  has_existing_rules?: boolean;
}

interface ErrorLocation {
  row: number;
  value: string;
  rule_failed: string;
  reason: string;
}
interface Rule {
  rule_type_id: number;
  rule_name: string;
  description: string;
  parameters: any;
  is_custom: boolean;
}

const validationOptions = ['Required', 'Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric'];

const Validate: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentStep,
    setCurrentStep,
    headers,
    setHeaders,
    selectedHeaders,
    setSelectedHeaders,
    validations,
    setValidations,
    errorLocations,
    setErrorLocations,
    dataRows,
    setDataRows,
    resetValidationState,
  } = useValidation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, Record<string, string>>>({});
  const [isExistingTemplate, setIsExistingTemplate] = useState<boolean>(false);
  const [hasFetchedCorrectionData, setHasFetchedCorrectionData] = useState<boolean>(false);
  const [correctedFilePath, setCorrectedFilePath] = useState<string | null>(null);
  const [fromRoute, setFromRoute] = useState<string | null>(null);
  const [errorRows, setErrorRows] = useState<any[]>([]);
  const [errorDescriptions, setErrorDescriptions] = useState<Record<string, string>>({});
  const initialFetchDone = useRef<boolean>(false);
  const [basicRules, setBasicRules] = useState<Rule[]>([]);
  const [customRules, setCustomRules] = useState<Rule[]>([]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const from = query.get('from');
    setFromRoute(from);

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getTemplate(Number(templateId), sheetName || 'Sheet1');
        console.log('Fetch template response:', response.data);
        const data = response.data as TemplateResponse;
        const actualSheetName = data.sheet_name;
        if (!actualSheetName || !data.sheets || !data.sheets[actualSheetName]) {
          throw new Error('Sheet data not found in the response. Please ensure the file has a valid sheet.');
        }
        setSheetName(actualSheetName);
        setFileName(data.file_name);
        const fetchedHeaders = data.sheets[actualSheetName].headers;
        if (!fetchedHeaders || fetchedHeaders.length === 0) {
          throw new Error('No headers found in the file. Please ensure the file has a valid header row.');
        }
        setHeaders(fetchedHeaders);
        const query = new URLSearchParams(location.search);
        const step = query.get('step') ? parseInt(query.get('step')!) : 1;
        console.log('Setting current step:', step, 'has_existing_rules:', data.has_existing_rules);
        setCurrentStep(step);
        if (!initialFetchDone.current) {
          setIsExistingTemplate(from === 'rule-configurations' ? false : (data.has_existing_rules || false));
          initialFetchDone.current = true;
        }

        // Pre-populate rules if coming from RuleConfigurations and navigating to Step 3
        if (from === 'rule-configurations' && step === 3) {
          const rulesResponse = await apiService.getTemplateRules(Number(templateId));
          if (rulesResponse.data.success) {
            setSelectedHeaders(Object.keys(rulesResponse.data.rules));
            setValidations(rulesResponse.data.rules);
            setIsReviewMode(true); // Set review mode for Step 3
          }
        }
      } catch (error: any) {
        console.error('Error fetching template:', error);
        setError(error.response?.data?.error || error.message || 'Failed to load template headers.');
        toast({
          title: 'Error',
          description: error.response?.data?.error || error.message || 'Failed to load template headers.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, sheetName, setHeaders, setCurrentStep, location.search]);
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await apiService.getRules();
        const allRules = response.data.rules || [];
        setBasicRules(allRules.filter((rule) => !rule.is_custom));
        setCustomRules(allRules.filter((rule) => rule.is_custom));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load rules.',
          variant: 'destructive',
        });
      }
    };
    fetchRules();
  }, []);
  useEffect(() => {
  if (currentStep === 2 && selectedHeaders.length > 0) {
    const newValidations = { ...validations };
    selectedHeaders.forEach((header) => {
      if (!newValidations[header]) {
        newValidations[header] = ['Required'];
      } else if (!newValidations[header].includes('Required')) {
        newValidations[header] = ['Required', ...newValidations[header]];
      }
    });
    setValidations(newValidations);
  }
}, [currentStep, selectedHeaders, setValidations]);

  useEffect(() => {
    if (isExistingTemplate && !hasFetchedCorrectionData) {
      console.log('Fetching correction data for existing template');
      fetchCorrectionData();
      setHasFetchedCorrectionData(true);
    }
  }, [isExistingTemplate, hasFetchedCorrectionData]);

  useEffect(() => {
    console.log('errorLocations updated:', errorLocations);
  }, [errorLocations]);

  const fetchCorrectionData = async () => {
    try {
      const response = await apiService.validateExistingTemplate(Number(templateId));
      console.log('Correction data received:', response.data);
      const newErrorLocations = response.data.error_cell_locations || {};
      const newDataRows = response.data.data_rows || [];
      setErrorLocations(newErrorLocations);
      setDataRows(newDataRows);

      // Process error rows and descriptions for Step 1
      const errorRowsMap: Record<string, any> = {};
      const descriptions: Record<string, string> = {};

      Object.entries(newErrorLocations).forEach(([header, errors]) => {
        if (Array.isArray(errors)) {
          (errors as ErrorLocation[]).forEach((error: ErrorLocation) => {
            const rowIndex = error.row - 1;
            const rowKey = rowIndex.toString();
            if (!errorRowsMap[rowKey]) {
              errorRowsMap[rowKey] = newDataRows[rowIndex];
            }
            if (!descriptions[rowKey]) {
              descriptions[rowKey] = '';
            }
            descriptions[rowKey] += `${header}: Rule "${error.rule_failed}" failed - ${error.reason}; `;
          });
        }
      });

      const filteredErrorRows = Object.values(errorRowsMap);
      setErrorRows(filteredErrorRows);
      setErrorDescriptions(descriptions);

      console.log('Updated errorLocations:', newErrorLocations);
      console.log('Updated dataRows:', newDataRows);
      console.log('Error rows:', filteredErrorRows);
      console.log('Error descriptions:', descriptions);
    } catch (error: any) {
      console.error('Error fetching correction data:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Failed to load correction data.',
        variant: 'destructive',
      });
    }
  };

  const validateRules = (): boolean => {
    const dataTypes = ['Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric', ...customRules.map((r) => r.rule_name)];
    for (const header of selectedHeaders) {
      const rules = validations[header] || [];
      const hasRequired = rules.includes('Required');
      const selectedDataTypes = rules.filter((r) => dataTypes.includes(r));
      if (!hasRequired || selectedDataTypes.length !== 1) {
        toast({
          title: 'Validation Error',
          description: "Each column must have 'Required' and exactly one of 'Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric', or a custom rule selected.",
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const handleStepSubmit = async (step: number, data: any, action: string = 'save') => {
    try {
      let response;
      switch (step) {
        case 1:
          console.log('Submitting Step 1 with data:', data);
          response = await apiService.submitStepOne({
            headers: data?.headers || selectedHeaders,
            new_header_row: data?.new_header_row,
          });
          if (response.data.success) {
            setSelectedHeaders(data.headers);
            setCurrentStep(2);
            setIsReviewMode(false);
            navigate(`/validate/${templateId}?step=2${fromRoute ? `&from=${fromRoute}` : ''}`);
          }
          break;
        case 2:
          console.log('Submitting Step 2 with data:', { validations: data?.validations || validations, action });
          if (action === 'review' && !validateRules()) {
            return;
          }
          response = await apiService.submitStepTwo({
            validations: data?.validations || validations,
            action: action,
          });
          if (response.data.success) {
            if (action === 'save') {
              toast({
                title: 'Success',
                description: 'Rules saved successfully',
                variant: 'default',
              });
              navigate(fromRoute === 'rule-configurations' ? '/rule-configurations' : '/dashboard');
            } else if (action === 'review') {
              toast({
                title: 'Success',
                description: 'Validation rules saved. Moving to review.',
                variant: 'default',
              });
              setCurrentStep(3);
              setIsReviewMode(true);
              navigate(`/validate/${templateId}?step=3${fromRoute ? `&from=${fromRoute}` : ''}`);
            }
          }
          break;
        default:
          throw new Error(`Invalid step: ${step}`);
      }
    } catch (error: any) {
      console.error(`Error in step ${step}:`, error);
      toast({
        title: `Step ${step} Error`,
        description: error.response?.data?.error || `Failed to complete step ${step}.`,
        variant: 'destructive',
      });
    }
  };

  const handleValidateExisting = async () => {
    try {
      const response = await apiService.saveExistingTemplateCorrections(Number(templateId), corrections);
      toast({
        title: 'Success',
        description: 'Corrections saved successfully',
        variant: 'default',
      });
      setCorrectedFilePath(response.data.corrected_file_path || null);
    } catch (error: any) {
      console.error('Error in validate existing:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save corrections.',
        variant: 'destructive',
      });
    }
  };

  const handleValidationChange = (header: string, rule: string, checked: boolean) => {
    const newValidations = { ...validations };
    if (!newValidations[header]) newValidations[header] = ['Required'];
    const dataTypes = ['Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric', ...customRules.map((r) => r.rule_name)];

    if (checked) {
      if (dataTypes.includes(rule)) {
        const alreadySelected = newValidations[header].filter((r) => dataTypes.includes(r));
        if (alreadySelected.length >= 1) {
          toast({
            title: 'Validation Error',
            description: "Please select only one of 'Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric', or a custom rule for each column.",
            variant: 'destructive',
          });
          return;
        }
        newValidations[header].push(rule);
      }
    } else if (rule !== 'Required') {
      newValidations[header] = newValidations[header].filter((r) => r !== rule);
      if (!newValidations[header].includes('Required')) {
        newValidations[header].unshift('Required');
      }
    } else {
      toast({
        title: 'Validation Error',
        description: "'Required' rule cannot be removed.",
        variant: 'destructive',
      });
      return;
    }
    setValidations(newValidations);
  };
  const onDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    const header = destination.droppableId.replace('applied-', '');
    const isAppliedDroppable = destination.droppableId.startsWith('applied-');
    const isAvailableDroppable = source.droppableId === 'available-rules';

    if (isAppliedDroppable && isAvailableDroppable) {
      const rule = validationOptions.slice(1).concat(customRules.map((r) => r.rule_name))[source.index];
      handleValidationChange(header, rule, true);
    } else if (isAppliedDroppable && source.droppableId === destination.droppableId) {
      const newRules = [...(validations[header] || []).filter((r) => r !== 'Required')];
      const [reorderedRule] = newRules.splice(source.index, 1);
      newRules.splice(destination.index, 0, reorderedRule);
      setValidations({ ...validations, [header]: ['Required', ...newRules] });
    } else if (source.droppableId.startsWith('applied-') && destination.droppableId === 'available-rules') {
      const sourceHeader = source.droppableId.replace('applied-', '');
      const rule = (validations[sourceHeader] || []).filter((r) => r !== 'Required')[source.index];
      if (rule) {
        handleValidationChange(sourceHeader, rule, false);
      }
    }
  };

  const handleCorrectionChange = (header: string, row: number, value: string) => {
    setCorrections((prev) => {
      const newCorrections = { ...prev };
      if (!newCorrections[header]) newCorrections[header] = {};
      newCorrections[header][row.toString()] = value;
      return newCorrections;
    });
  };

  const validateInput = (header: string, value: string): boolean => {
  const rules = validations[header] || [];
  let isValid = true;
  let errorMessage = '';

  rules.forEach((rule) => {
    if (!isValid) return;
    switch (rule) {
      case 'Required':
        if (!value || value.trim() === '') {
          isValid = false;
          errorMessage = 'Value is required';
        }
        break;
      case 'Int':
        if (value && !/^-?\d+$/.test(value)) {
          isValid = false;
          errorMessage = 'Value must be an integer';
        }
        break;
      case 'Float':
        if (value && !/^-?\d*\.?\d+$/.test(value)) {
          isValid = false;
          errorMessage = 'Value must be a number (integer or decimal)';
        }
        break;
      case 'Email':
        const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA.Z0-9-]+\.[a-zA.Z0-9-.]+$/;
        if (value && !emailRegex.test(value)) {
          isValid = false;
          errorMessage = 'Invalid email format';
        }
        break;
      case 'Date':
        const dateFormats = ['\\d{2}-\\d{2}-\\d{4}', '\\d{2}/\\d{2}/\\d{4}', '\\d{4}-\\d{2}-\\d{2}'];
        const dateRegex = new RegExp(`^(${dateFormats.join('|')})$`);
        if (value && !dateRegex.test(value)) {
          isValid = false;
          errorMessage = 'Invalid date format (e.g., DD-MM-YYYY)';
        }
        break;
      case 'Text':
        const hasSpecial = /[^a-zA-Z\s"()]/g.test(value);
        if (value && hasSpecial) {
          isValid = false;
          errorMessage = 'Only letters, spaces, quotes, and parentheses are allowed';
        }
        break;
      case 'Boolean':
        if (value && !/^(true|false|0|1)$/i.test(value)) {
          isValid = false;
          errorMessage = 'Value must be a boolean (true/false or 0/1)';
        }
        break;
      case 'Alphanumeric':
        if (value && !/^[a-zA-Z0-9]+$/g.test(value)) {
          isValid = false;
          errorMessage = 'Only alphanumeric characters are allowed';
        }
        break;
    }
  });

  if (!isValid) {
    toast({
      title: 'Validation Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }

  return isValid;
};

  const handleDownload = () => {
    if (correctedFilePath) {
      apiService.downloadFile(correctedFilePath);
      navigate('/dashboard'); // Redirect to home after download
    } else {
      toast({
        title: 'Error',
        description: 'No corrected file available for download.',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    const fetchTemplate = async () => {
      try {
        const response = await apiService.getTemplate(Number(templateId), sheetName || 'Sheet1');
        console.log('Retry fetch template response:', response.data);
        const data = response.data as TemplateResponse;
        const actualSheetName = data.sheet_name;
        if (!actualSheetName || !data.sheets || !data.sheets[actualSheetName]) {
          throw new Error('Sheet data not found in the response. Please ensure the file has a valid sheet.');
        }
        setSheetName(actualSheetName);
        setFileName(data.file_name);
        const fetchedHeaders = data.sheets[actualSheetName].headers;
        if (!fetchedHeaders || fetchedHeaders.length === 0) {
          throw new Error('No headers found in the file. Please ensure the file has a valid header row.');
        }
        setHeaders(fetchedHeaders);
        setCurrentStep(1);
        setIsReviewMode(false);
        setIsExistingTemplate(fromRoute === 'rule-configurations' ? false : (data.has_existing_rules || false));
        initialFetchDone.current = false; // Reset for retry
      } catch (error: any) {
        console.error('Retry error fetching template:', error);
        setError(error.response?.data?.error || error.message || 'Failed to load template headers.');
        toast({
          title: 'Error',
          description: error.response?.data?.error || error.message || 'Failed to load template headers.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  };

  const steps = fromRoute === 'rule-configurations'
    ? [
        { step: 1, label: 'Select Column Headers' },
        { step: 2, label: 'Configure Rules' },
        { step: 3, label: 'Review Configured Rules' },
      ]
    : [
        { step: 4, label: 'Step 1 - Error Detection' },
        { step: 5, label: 'Step 2 - Error Correction' },
        { step: 6, label: 'Step 3 - Review and Finalization' },
      ];

  const progress = (currentStep / steps.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading headers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Error</h2>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-600 mb-4">
            Please ensure your file has a valid sheet with headers. If the issue persists, try uploading a different file or contact support.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              onClick={handleRetry}
            >
              Retry
            </Button>
            <Button
              className="bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              onClick={() => navigate(fromRoute === 'rule-configurations' ? '/rule-configurations' : '/dashboard')}
            >
              Back to {fromRoute === 'rule-configurations' ? 'Rule Configurations' : 'Dashboard'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <Card className="shadow-xl border border-gray-200 rounded-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-blue-800">
              {isExistingTemplate && !isReviewMode
                ? 'Correct Errors in Existing Template'
                : fromRoute === 'rule-configurations'
                ? `Configure File - Step ${currentStep}`
                : `Data Validation - ${steps[currentStep - 4].label}`}
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => navigate(fromRoute === 'rule-configurations' ? '/rule-configurations' : '/dashboard')}
              className="flex items-center space-x-2 mt-2 w-fit"
            >
              <Home className="h-5 w-5" />
              <span>{fromRoute === 'rule-configurations' ? 'Rule Configurations' : 'Home'}</span>
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mt-4">
              <Progress value={progress} className="w-full h-2 bg-gray-200" />
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                {steps.map((s) => (
                  <span
                    key={s.step}
                    className={`font-medium ${
                      s.step === currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            {(isExistingTemplate && !isReviewMode && fromRoute !== 'rule-configurations') ? (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                  Correct Errors in "{fileName}"
                </h3>
                {Object.keys(errorLocations).length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      The following errors were found in your file based on existing validation rules. Please correct them:
                    </p>
                    {Object.entries(errorLocations).map(([header, errors]) => (
                      <div key={header} className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-2">{header}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Original Value</TableHead>
                              <TableHead>Corrected Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(errors as ErrorLocation[]).map((error: ErrorLocation, index: number) => (
                              <TableRow
                                key={index}
                                className="hover:bg-gray-100 transition-colors"
                              >
                                <TableCell>{error.row}</TableCell>
                                <TableCell className="text-red-600">{error.value}</TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    placeholder="Enter corrected value"
                                    onBlur={(e) =>
                                      handleCorrectionChange(header, error.row - 1, e.target.value)
                                    }
                                    className="border rounded p-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                    <div className="mt-4 flex space-x-4">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={handleValidateExisting}
                      >
                        Save Corrections
                      </Button>
                      {correctedFilePath && (
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white transition-colors"
                          onClick={handleDownload}
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Download Corrected File
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-green-600 mb-4">No errors found in your file.</p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      onClick={() => navigate(fromRoute === 'rule-configurations' ? '/rule-configurations' : '/dashboard')}
                    >
                      Finish
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {currentStep === 1 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 1: Select Column Headers</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select Column Headers to configure Rules for Error Correction from "{fileName}":
                    </p>
                    {headers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Select</TableHead>
                            <TableHead>Header</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {headers.map((header, index) => (
                            <TableRow
                              key={index}
                              className="hover:bg-gray-100 transition-colors"
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  value={header}
                                  checked={selectedHeaders.includes(header)}
                                  onChange={(e) => {
                                    const newHeaders = e.target.checked
                                      ? [...selectedHeaders, header]
                                      : selectedHeaders.filter((h) => h !== header);
                                    setSelectedHeaders(newHeaders);
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </TableCell>
                              <TableCell className="text-gray-800">{header}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-red-600">No headers available to display.</p>
                    )}
                    <Button
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handleStepSubmit(1, { headers: selectedHeaders })}
                      disabled={selectedHeaders.length === 0}
                    >
                      Next
                    </Button>
                  </div>
                )}
         {currentStep === 2 && (
  <div>
    <h3 className="text-lg font-semibold mb-4 text-gray-700">
      Step 2: Configure Rules
    </h3>
    <p className="text-sm text-gray-600 mb-4">
      Drag and drop one data type rule from the left to apply it to each column header in "{fileName}". Click the 'X' to delete a data type rule. The 'Required' rule is automatically applied and cannot be removed.
    </p>
    <DragDropContext onDragEnd={(result: DropResult) => {
      if (!result.destination) return;
      const { source, destination } = result;
      const header = destination.droppableId.replace('applied-', '');
      const isAppliedDroppable = destination.droppableId.startsWith('applied-');
      const isAvailableDroppable = source.droppableId === 'available-rules';

      if (isAppliedDroppable && isAvailableDroppable) {
        const rule = validationOptions.slice(1)[source.index];
        handleValidationChange(header, rule, true);
      } else if (isAppliedDroppable && source.droppableId === destination.droppableId) {
        const newRules = [...(validations[header] || []).filter(r => r !== 'Required')];
        const [reorderedRule] = newRules.splice(source.index, 1);
        newRules.splice(destination.index, 0, reorderedRule);
        setValidations({ ...validations, [header]: ['Required', ...newRules] });
      } else if (source.droppableId.startsWith('applied-') && destination.droppableId === 'available-rules') {
        const sourceHeader = source.droppableId.replace('applied-', '');
        const rule = (validations[sourceHeader] || []).filter(r => r !== 'Required')[source.index];
        if (rule) {
          handleValidationChange(sourceHeader, rule, false);
        }
      }
    }}>
      <div className="flex space-x-6">
        <div className="w-1/4">
          <h5 className="text-sm font-semibold text-gray-600 mb-2">Available Data Type Rules</h5>
          <Droppable droppableId="available-rules">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="bg-gray-100 p-4 rounded-lg min-h-[400px] max-h-[600px] overflow-y-auto"
              >
                {validationOptions.slice(1).map((rule, index) => (
                  <Draggable key={rule} draggableId={rule} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white p-2 mb-2 rounded shadow-sm border border-gray-200 cursor-move text-center"
                      >
                        {rule}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
        <div className="w-3/4">
          <h5 className="text-sm font-semibold text-gray-600 mb-2">Apply Rules to Headers</h5>
          <Table>
            <TableHeader>
              <TableRow>
                {selectedHeaders.map((header, index) => (
                  <TableHead key={index} className="text-center">{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {selectedHeaders.map((header, index) => (
                  <TableCell key={index} className="p-2">
                    <Droppable droppableId={`applied-${header}`}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="bg-blue-50 p-2 rounded min-h-[100px] max-h-[200px] overflow-y-auto"
                        >
                          <div className="bg-blue-100 p-2 mb-1 rounded shadow-sm border border-blue-200 text-center">
                            Required
                          </div>
                          {(validations[header] || []).filter(r => r !== 'Required').map((rule, ruleIndex) => (
                            <Draggable key={`${header}-${rule}`} draggableId={`${header}-${rule}`} index={ruleIndex}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-blue-100 p-2 mb-1 rounded shadow-sm border border-blue-200 flex items-center justify-between"
                                >
                                  <span>{rule}</span>
                                  <button
                                    onClick={() => handleValidationChange(header, rule, false)}
                                    className="text-red-500 hover:text-red-700 text-sm font-bold"
                                    title="Delete rule"
                                  >
                                    X
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </DragDropContext>
    <div className="mt-4 flex space-x-4">
      <Button
        variant="outline"
        className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        onClick={() => {
          setCurrentStep(1);
          setIsReviewMode(false);
          navigate(`/validate/${templateId}?step=1${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        onClick={() => handleStepSubmit(2, { validations }, 'review')}
      >
        Save and Review
      </Button>
    </div>
  </div>
)}
                {currentStep === 3 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">
                      Step 3: Review Configured Rules
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Review the rule Configurations applied to the selected headers for "{fileName}":
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Header</TableHead>
                          {validationOptions.map((rule) => (
                            <TableHead key={rule}>{rule}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedHeaders.map((header) => (
                          <TableRow key={header}>
                            <TableCell className="text-gray-800">{header}</TableCell>
                            {validationOptions.map((rule) => (
                              <TableCell key={rule}>
                                <input
                                  type="checkbox"
                                  checked={validations[header]?.includes(rule) || false}
                                  disabled={true}
                                  className="h-4 w-4 text-black focus:ring-black border-black rounded"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex space-x-4">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => {
                          setCurrentStep(2);
                          setIsReviewMode(false);
                          navigate(`/validate/${templateId}?step=2${fromRoute ? `&from=${fromRoute}` : ''}`);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => handleStepSubmit(2, { validations }, 'save')}
                      >
                        Finish
                      </Button>
                    </div>
                  </div>
                )}
                {/* Step 4: Error Detection */}
                {currentStep === 4 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">
                      Step 1 - Error Detection
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The following rows contain errors based on the configured validation rules for "{fileName}":
                    </p>
                    {errorRows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row Index</TableHead>
                            {headers.map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                            <TableHead>Error Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorRows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell>{rowIndex + 1}</TableCell>
                              {headers.map((header, colIndex) => {
                                const hasError = errorLocations[header]?.some(
                                  (err: ErrorLocation) => err.row - 1 === rowIndex
                                );
                                return (
                                  <TableCell
                                    key={colIndex}
                                    className={hasError ? 'bg-red-100 text-red-600' : ''}
                                  >
                                    {row[header]}
                                  </TableCell>
                                );
                              })}
                              <TableCell>{errorDescriptions[rowIndex.toString()]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-green-600">No errors found in your file.</p>
                    )}
                    <div className="mt-4">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => {
                          setCurrentStep(5);
                          navigate(`/validate/${templateId}?step=5${fromRoute ? `&from=${fromRoute}` : ''}`);
                        }}
                        disabled={errorRows.length === 0}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                {/* Step 5: Error Correction */}
                {currentStep === 5 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">
                      Step 2 - Error Correction
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Correct the errors in the following rows for "{fileName}". Original values are shown for reference.
                    </p>
                    {errorRows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row Index</TableHead>
                            {headers.map((header, index) => (
                              <TableHead key={index}>{header} (Original)</TableHead>
                            ))}
                            {headers.map((header, index) => (
                              <TableHead key={`corrected-${index}`}>
                                {header} (Corrected)
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorRows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell>{rowIndex + 1}</TableCell>
                              {headers.map((header, colIndex) => {
                                const hasError = errorLocations[header]?.some(
                                  (err: ErrorLocation) => err.row - 1 === rowIndex
                                );
                                return (
                                  <TableCell
                                    key={colIndex}
                                    className={hasError ? 'bg-red-100 text-red-600' : ''}
                                  >
                                    {row[header]}
                                  </TableCell>
                                );
                              })}
                              {headers.map((header, colIndex) => {
                                const hasError = errorLocations[header]?.some(
                                  (err: ErrorLocation) => err.row - 1 === rowIndex
                                );
                                return (
                                  <TableCell key={`corrected-${colIndex}`}>
                                    {hasError ? (
                                      <Input
                                        type="text"
                                        placeholder="Enter corrected value"
                                        defaultValue={corrections[header]?.[rowIndex.toString()] || row[header]}
                                        onBlur={(e) => {
                                          if (validateInput(header, e.target.value)) {
                                            handleCorrectionChange(header, rowIndex, e.target.value);
                                          }
                                        }}
                                        className="border rounded p-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                                      />
                                    ) : (
                                      row[header]
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-green-600">No errors to correct.</p>
                    )}
                    <div className="mt-4 flex space-x-4">
                      <Button
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setCurrentStep(4);
                          navigate(`/validate/${templateId}?step=4${fromRoute ? `&from=${fromRoute}` : ''}`);
                        }}
                      >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => {
                          setCurrentStep(6);
                          navigate(`/validate/${templateId}?step=6${fromRoute ? `&from=${fromRoute}` : ''}`);
                        }}
                      >
                        Save and Review
                      </Button>
                    </div>
                  </div>
                )}
                {/* Step 6: Review and Finalization */}
                {currentStep === 6 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">
                      Step 3 - Review and Finalization
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Review the corrected data for "{fileName}". Corrected cells are highlighted in yellow.
                    </p>
                    {errorRows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row Index</TableHead>
                            {headers.map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorRows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell>{rowIndex + 1}</TableCell>
                              {headers.map((header, colIndex) => {
                                const hasError = errorLocations[header]?.some(
                                  (err: ErrorLocation) => err.row - 1 === rowIndex
                                );
                                const correctedValue = corrections[header]?.[rowIndex.toString()];
                                const displayValue = correctedValue !== undefined ? correctedValue : row[header];
                                return (
                                  <TableCell
                                    key={colIndex}
                                    className={hasError && correctedValue !== undefined ? 'bg-yellow-100 font-semibold' : ''}
                                  >
                                    {displayValue}
                                    {hasError && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Original: {row[header]}
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-green-600">No corrections to review.</p>
                    )}
                    <div className="mt-4 flex space-x-4">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={() => {
                          setCurrentStep(5);
                          navigate(`/validate/${templateId}?step=5${fromRoute ? `&from=${fromRoute}` : ''}`);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        onClick={async () => {
                          await handleValidateExisting();
                          navigate('/dashboard');
                        }}
                      >
                        Finish
                      </Button>
                      {correctedFilePath && (
                        <Button
                          className="bg-green-600 hover:bg-blue-700 text-white transition-colors"
                          onClick={handleDownload}
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Download Corrected File
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Validate;