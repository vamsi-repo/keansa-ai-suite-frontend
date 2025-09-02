import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { AlertCircle, Home, Download, ArrowLeft } from 'lucide-react';
import { useValidation } from '../contexts/ValidationContext';
import { toast } from '../hooks/use-toast';
import * as apiService from '../services/api';
import { Sidebar } from '../components/Sidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { RefreshCw } from 'lucide-react';

// Enterprise Toast Messages for Validation
const ValidationToastMessages = {
  Required: {
    title: "Required Field Missing",
    message: "This field is mandatory and cannot be left empty."
  },
  Email: {
    invalid: {
      title: "Invalid Email Format", 
      message: "Please enter a valid email address (e.g., user@company.com)."
    },
    domain: {
      title: "Incorrect Email Domain",
      message: "Check your email domain. Use '.' not ',' (e.g., @gmail.com)."
    }
  },
  Date: {
    format: (sourceFormat) => ({
      title: "Date Format Mismatch",
      message: `Expected format: ${sourceFormat} (e.g., ${getDateExample(sourceFormat)}). Please correct your entry.`
    }),
    incomplete: (sourceFormat) => ({
      title: "Incomplete Date", 
      message: `Please enter complete date in ${sourceFormat} format.`
    }),
    separator: (sourceFormat) => ({
      title: "Wrong Date Separator",
      message: `Use correct separator for ${sourceFormat} format.`
    }),
    values: {
      title: "Invalid Date Values",
      message: "Day must be 01-31 and month must be 01-12. Please verify your entry."
    }
  },
  Int: {
    decimal: {
      title: "Integer Required",
      message: "This field accepts whole numbers only. Remove decimal points."
    },
    text: {
      title: "Invalid Number Format", 
      message: "Enter numbers only (e.g., 123, -456). Remove letters and special characters."
    },
    special: {
      title: "Numeric Data Expected",
      message: "Please enter a valid integer without commas or special characters."
    }
  },
  Float: {
    text: {
      title: "Invalid Numeric Data",
      message: "Enter a valid number (integers or decimals allowed, e.g., 123.45)."
    },
    multipleDecimals: {
      title: "Number Format Error",
      message: "Only one decimal point allowed in numeric values."
    }
  },
  Text: {
    special: {
      title: "Invalid Text Characters",
      message: "Text fields accept letters, spaces, quotes, and parentheses only."
    },
    numbers: {
      title: "Numbers Not Allowed", 
      message: "This text field cannot contain numeric characters."
    }
  },
  Boolean: {
    invalid: {
      title: "Invalid Boolean Value",
      message: "Enter: true, false, 0, or 1 only."
    }
  },
  Alphanumeric: {
    special: {
      title: "Alphanumeric Only",
      message: "This field accepts letters (A-Z) and numbers (0-9) only."
    },
    spaces: {
      title: "Remove Special Characters", 
      message: "Spaces and special characters not allowed. Use letters and numbers only."
    }
  },
  Custom: {
    failed: (ruleName) => ({
      title: "Custom Rule Violation",
      message: `Entry does not meet requirements for rule: ${ruleName}.`
    })
  },
  General: {
    validation: {
      title: "Data Validation Failed",
      message: "Please correct the highlighted errors before proceeding."
    }
  }
};

// Helper function for date examples
const getDateExample = (sourceFormat) => {
  const examples = {
    'DD-MM-YYYY': '01-12-2025',
    'MM-DD-YYYY': '12-01-2025',
    'MM/DD/YYYY': '12/01/2025', 
    'DD/MM/YYYY': '01/12/2025',
    'MM-YYYY': '12-2025',
    'MM-YY': '12-25',
    'MM/YYYY': '12/2025',
    'MM/YY': '12/25'
  };
  return examples[sourceFormat] || '01-01-2025';
};

// Define TypeScript interfaces
interface TemplateResponse {
  sheets: { [key: string]: { headers: string[] } };
  file_name: string;
  file_path: string;
  sheet_name: string;
  has_existing_rules?: boolean;
  validations?: Record<string, string[]>;
}

interface ErrorLocation {
  row: number;
  value: string;
  rule_failed: string;
  reason: string;
}

interface Rule {
  rule_id: number;
  rule_name: string;
  description: string;
  parameters: string;
  is_custom: boolean;
  column_name?: string;
  template_id?: number;
  source_format?: string;
  target_format?: string;
  data_type?: string;
}

const validationOptions = ['Required', 'Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric'];

const Validate: React.FC = () => {
  // Show toast when invalid data is entered in Step 5
  function handleGenericCorrectionChangeWithToast(header: string, rowIndex: number, value: string) {
    handleGenericCorrectionChange(header, rowIndex, value);
    // The toast will be shown from within validateCorrectionInput
  }
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentStep, setCurrentStep, headers, setHeaders, selectedHeaders, setSelectedHeaders, 
    validations, setValidations, errorLocations, setErrorLocations, dataRows, setDataRows 
  } = useValidation();
const [transformationApplied, setTransformationApplied] = useState(false);
const [transformationLoading, setTransformationLoading] = useState(false);
const [transformedFilePath, setTransformedFilePath] = useState<string | null>(null);
const [correctionValidationErrors, setCorrectionValidationErrors] = useState<Record<string, Record<string, string>>>({});
const [hasValidationErrors, setHasValidationErrors] = useState(false);

  const [loading, setLoading] = useState(true);
  const [fetchingErrors, setFetchingErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, Record<string, string>>>({});
  const [hasExistingRules, setHasExistingRules] = useState<boolean>(false);
  const [hasFetchedCorrectionData, setHasFetchedCorrectionData] = useState<boolean>(false);
  const [correctedFilePath, setCorrectedFilePath] = useState<string | null>(null);
  const [fromRoute, setFromRoute] = useState<string | null>(null);
  const [errorRows, setErrorRows] = useState<any[]>([]);
  const [errorReasons, setErrorReasons] = useState<Record<string, string>>({});
  const [frequencyDialogOpen, setFrequencyDialogOpen] = useState(false);
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY' | ''>('');
  const initialFetchDone = useRef<boolean>(false);
  const sftpCredentials = location.state?.sftpCredentials || JSON.parse(localStorage.getItem('sftpCredentials') || '{}');

  const [basicRules, setBasicRules] = useState<Rule[]>([]);
  const [customRules, setCustomRules] = useState<Rule[]>([]);
  const [checkedCustomRules, setCheckedCustomRules] = useState<{ [key: number]: boolean }>({});
  const [validationCompleted, setValidationCompleted] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [sourceFormats, setSourceFormats] = useState<Record<string, string>>({});
  const [targetFormats, setTargetFormats] = useState<Record<string, string>>({});
  const [dateFormatDialog, setDateFormatDialog] = useState<{ open: boolean; header: string; rule: string; format?: string }>({
    open: false,
    header: '',
    rule: '',
    format: ''
  });
  
  type CorrectionValidity = Record<string, Record<string, boolean>>;
  const [correctionValidity, setCorrectionValidity] = useState<CorrectionValidity>({});
  
  const [genericErrorLocations, setGenericErrorLocations] = useState<Record<string, ErrorLocation[]>>({});
  const [genericDataRows, setGenericDataRows] = useState<any[]>([]);
  const [genericCorrections, setGenericCorrections] = useState<Record<string, Record<string, string>>>({});
  const [genericErrorReasons, setGenericErrorReasons] = useState<Record<string, string>>({});

  const [customErrorLocations, setCustomErrorLocations] = useState<Record<string, ErrorLocation[]>>({});
  const [customDataRows, setCustomDataRows] = useState<any[]>([]);
  const [customCorrections, setCustomCorrections] = useState<Record<string, Record<string, string>>>({});
  const [customErrorReasons, setCustomErrorReasons] = useState<Record<string, string>>({});
  const [localDataRows, setLocalDataRows] = useState<any[]>([]);
  const [rowValidity, setRowValidity] = useState<Record<string, boolean>>({});
  
  const [genericRulesApplied, setGenericRulesApplied] = useState(0);
  const [genericErrorsDetected, setGenericErrorsDetected] = useState(0);
  const [genericErrorsCorrected, setGenericErrorsCorrected] = useState(0);
  const [customRulesApplied, setCustomRulesApplied] = useState(0);
  const [customErrorsDetected, setCustomErrorsDetected] = useState(0);
  const [customErrorsCorrected, setCustomErrorsCorrected] = useState(0);

  const [genericCorrectedFilePath, setGenericCorrectedFilePath] = useState<string | null>(null);
  const [finalCorrectedFilePath, setFinalCorrectedFilePath] = useState<string | null>(null);

  const [fetchingCustomErrors, setFetchingCustomErrors] = useState(false);
  const [validatingRow, setValidatingRow] = useState(false);
  const [hasFetchedCustom, setHasFetchedCustom] = useState(false);


const handleGenericCorrectionChange = async (header: string, rowIndex: number, value: string) => {
  const updatedCorrections = { ...genericCorrections };
  if (!updatedCorrections[header]) updatedCorrections[header] = {};
  updatedCorrections[header][rowIndex.toString()] = value;
  setGenericCorrections(updatedCorrections);

  // Validate the input
  const isValid = await validateCorrectionInput(header, rowIndex, value);
  
  // Update correction validity
  const updatedValidity = { ...correctionValidity };
  if (!updatedValidity[header]) updatedValidity[header] = {};
  updatedValidity[header][rowIndex.toString()] = isValid;
  setCorrectionValidity(updatedValidity);
};

  // In Validate.tsx, update the useEffect for fetchTemplate
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const from = query.get('from');
    setFromRoute(from);

    const fetchTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getTemplate(Number(templateId), sheetName || 'Sheet1');
        const data = response.data as TemplateResponse;
        const actualSheetName = data.sheet_name;
        if (!actualSheetName || !data.sheets || !data.sheets[actualSheetName]) {
          throw new Error('Sheet data not found in the response.');
        }
        setSheetName(actualSheetName);
        setFileName(data.file_name);
        const fetchedHeaders = data.sheets[actualSheetName].headers;
        if (!fetchedHeaders || fetchedHeaders.length === 0) {
          throw new Error('No headers found in the file.');
        }
        setHeaders(fetchedHeaders);
        const queryStep = query.get('step') ? parseInt(query.get('step')!) : 1;
        setCurrentStep(queryStep);
        if (!initialFetchDone.current) {
          setHasExistingRules(data.has_existing_rules || false);
          initialFetchDone.current = true;
        }
        if (queryStep === 3 && from === 'rule-configurations') {
          const rulesResponse = await apiService.getTemplateRules(Number(templateId));
          if (rulesResponse.data.success) {
            setSelectedHeaders(Object.keys(rulesResponse.data.rules));
            setValidations(rulesResponse.data.rules);
            setIsReviewMode(true);
          } else {
            toast({
              title: 'Error',
              description: rulesResponse.data.message || 'Failed to load configured rules.',
              variant: 'destructive',
            });
            setCurrentStep(1);
            navigate(`/validate/${templateId}?step=1&from=rule-configurations`);
          }
        }
      } catch (error: any) {
        setError(error.response?.data?.error || error.message || 'Failed to load template headers.');
        toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, sheetName, setHeaders, setCurrentStep, location.search]);

// 1. ADD NEW STATE VARIABLE FOR DISPLAYING DATA
const [transformationDataRows, setTransformationDataRows] = useState<any[]>([]);
const [transformationDataLoading, setTransformationDataLoading] = useState(false);

// 2. UPDATED useEffect FOR STEP 8 TO LOAD DATA
useEffect(() => {
  if (currentStep === 8 && templateId) {
    const fetchTransformationData = async () => {
      try {
        setTransformationDataLoading(true);
        
        // Fetch transformation rules
        const response = await apiService.getRules();
        const allRules = response.data.rules || [];
        
        const transformRules = allRules.filter(rule => 
          rule.template_id === Number(templateId) && 
          (rule.rule_name.startsWith('Transform-Date(') || rule.rule_name.startsWith('Date('))
        );
        
        const sourceFormatsMap: Record<string, string> = {};
        const targetFormatsMap: Record<string, string> = {};
        
        transformRules.forEach((rule) => {
          if (rule.column_name) {
            if (rule.rule_name.startsWith('Date(') && rule.source_format) {
              sourceFormatsMap[rule.column_name] = rule.source_format;
            } else if (rule.rule_name.startsWith('Transform-Date(') && rule.target_format) {
              targetFormatsMap[rule.column_name] = rule.target_format;
            }
          }
        });
        
        setSourceFormats(sourceFormatsMap);
        setTargetFormats(targetFormatsMap);
        
        // NEW: Fetch the actual file data for display
        const dataResponse = await apiService.getTransformedData(Number(templateId));
        if (dataResponse.data.success) {
          setTransformationDataRows(dataResponse.data.data_rows || []);
        } else {
          // Fallback: Get data from previous steps
          let dataToShow = [];
          if (customDataRows.length > 0) {
            dataToShow = [...customDataRows];
          } else if (genericDataRows.length > 0) {
            dataToShow = [...genericDataRows];
          } else if (localDataRows.length > 0) {
            dataToShow = [...localDataRows];
          }
          
          // Apply all corrections to the data
          const correctedData = dataToShow.map((row, rowIndex) => {
            const correctedRow = { ...row };
            
            // Apply generic corrections
            Object.entries(genericCorrections || {}).forEach(([header, corrections]) => {
              if (corrections[rowIndex.toString()]) {
                correctedRow[header] = corrections[rowIndex.toString()];
              }
            });
            
            // Apply custom corrections
            Object.entries(customCorrections || {}).forEach(([header, corrections]) => {
              if (corrections[rowIndex.toString()]) {
                correctedRow[header] = corrections[rowIndex.toString()];
              }
            });
            
            return correctedRow;
          });
          
          setTransformationDataRows(correctedData);
        }
        
        console.log('Transformation data loaded:', {
          sourceFormats: sourceFormatsMap,
          targetFormats: targetFormatsMap,
          dataRows: transformationDataRows.length
        });
        
      } catch (error: any) {
        console.error('Error fetching transformation data:', error);
        toast({
          title: 'Warning',
          description: 'Could not load transformation data.',
          variant: 'default',
        });
        setTransformationDataRows([]);
      } finally {
        setTransformationDataLoading(false);
      }
    };
    
    fetchTransformationData();
  }
}, [currentStep, templateId, genericDataRows, customDataRows, localDataRows, genericCorrections, customCorrections]);


  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await apiService.getRules();
        const allRules = response.data.rules || [];
        // Updated filter: Exclude date format and transformation rules from generics
        setBasicRules(allRules.filter((rule) =>
          !rule.is_custom &&
          !rule.rule_name.startsWith('Date(') &&
          !rule.rule_name.startsWith('Transform-Date(')
        ));
        setCustomRules(allRules.filter((rule) => rule.is_custom && !rule.rule_name.startsWith('Date(')));
        // Initialize checkedCustomRules with all custom rules unchecked
        const initialCheckedState = allRules
          .filter((rule) => rule.is_custom && !rule.rule_name.startsWith('Date('))
          .reduce((acc, rule) => ({
            ...acc,
            [rule.rule_id!]: false,
          }), {});
        console.log('Initializing checkedCustomRules for Step', currentStep, ':', initialCheckedState);
        setCheckedCustomRules(initialCheckedState);
        const sourceFormatsMap = {};
        const targetFormatsMap = {};
        allRules.forEach((rule) => {
          if (rule.rule_name.startsWith('Date(') && rule.source_format) {
            sourceFormatsMap[rule.column_name] = rule.source_format;
          } else if (rule.rule_name.startsWith('Transform-Date(') && rule.target_format) {
            targetFormatsMap[rule.column_name] = rule.target_format;
          }
        });
        setSourceFormats(sourceFormatsMap);
        setTargetFormats(targetFormatsMap);
      } catch (error) {
        console.error('Error fetching rules:', error);
        if (currentStep === 2) {
          toast({
            title: 'Error',
            description: 'Failed to load rules.',
            variant: 'destructive',
          });
        }
      }
    };
    fetchRules();
  }, [templateId, currentStep]);

useEffect(() => {
  if (currentStep === 3 && templateId) {
    const fetchCustomRules = async () => {
      try {
        const response = await apiService.getRules();
        // Filter for active custom rules only in Step 3
        const appliedCustomRules = response.data.rules.filter(
          (rule) => rule.is_custom && rule.template_id === Number(templateId) && rule.is_active
        );
        setCustomRules(appliedCustomRules);
        setCheckedCustomRules(
          appliedCustomRules.reduce((acc, rule) => ({
            ...acc,
            [rule.rule_id]: Object.values(validations).some((rules) =>
              rules.includes(rule.rule_name)
            ),
          }), {})
        );
      } catch (error) {
        console.error('Error fetching custom rules for Step 3:', error);
        toast({
          title: 'Error',
          description: 'Failed to load custom rules for review.',
          variant: 'destructive',
        });
      }
    };
    fetchCustomRules();
  } else if (currentStep === 2 && templateId) {
    // For Step 2, get ALL template custom rules (active and inactive)
    const fetchCustomRules = async () => {
      try {
        const response = await apiService.getRules();
        console.log('All rules response:', response.data.rules);
        
        const templateCustomRules = response.data.rules.filter(
          (rule) => {
            console.log(`Checking rule: ${rule.rule_name}, is_custom: ${rule.is_custom}, template_id: ${rule.template_id}, target_template: ${Number(templateId)}`);
            return rule.is_custom && rule.template_id === Number(templateId);
          }
        );
        
        console.log('Filtered template custom rules:', templateCustomRules);
        setCustomRules(templateCustomRules);
        
        // Initialize checked state based on is_active status from database
        const initialCheckedState = templateCustomRules.reduce((acc, rule) => {
          console.log(`Setting initial state for rule ${rule.rule_name}: is_active = ${rule.is_active}`);
          return {
            ...acc,
            [rule.rule_id]: rule.is_active || false, // Use database is_active status
          };
        }, {});
        
        console.log('Initial checked state:', initialCheckedState);
        setCheckedCustomRules(initialCheckedState);
        
      } catch (error) {
        console.error('Error fetching custom rules for Step 2:', error);
        toast({
          title: 'Error',
          description: 'Failed to load custom rules.',
          variant: 'destructive',
        });
      }
    };
    fetchCustomRules();
  }
}, [currentStep, templateId, validations]);

  useEffect(() => {
  if (currentStep === 4 && !hasFetchedCorrectionData && !fetchingErrors) {
    setFetchingErrors(true);
    fetchGenericCorrectionData();
  }
  if (currentStep === 6 && !hasFetchedCustom && !fetchingCustomErrors) {
    setFetchingCustomErrors(true);
    fetchCustomCorrectionData();
  }
}, [currentStep, hasFetchedCorrectionData, fetchingErrors, hasFetchedCustom, fetchingCustomErrors]);

  const fetchGenericCorrectionData = async () => {
    try {
      setFetchingErrors(true);
      const response = await apiService.validateGenericTemplate(Number(templateId));
      if (!response.data.success) {
        throw new Error('Failed to load generic validation errors');
      }
      const newErrorLocations = response.data.error_cell_locations || {};
      const newDataRows = response.data.data_rows || [];

      // Normalize data rows (as in your original code)
      const normalizedDataRows = newDataRows.map((row: any) => {
        const normalizedRow = { ...row };
        Object.keys(normalizedRow).forEach((key) => {
          if (normalizedRow[key] === null || normalizedRow[key] === undefined || normalizedRow[key] === 'NULL') {
            normalizedRow[key] = 'NULL';
          }
        });
        return normalizedRow;
      });

      // Aggregate reasons (as in original)
      const reasons: Record<string, string[]> = {};
      Object.entries(newErrorLocations).forEach(([header, errors]: [string, ErrorLocation[]]) => {
        errors.forEach((error: ErrorLocation) => {
          const rowIndex = error.row - 1;
          const rowKey = rowIndex.toString();
          if (!reasons[rowKey]) reasons[rowKey] = [];
          const ruleName = error.rule_failed;
          const reasonText = error.value === 'NULL' && ruleName === 'Required' ? 'Contains No Data' : error.reason;
          reasons[rowKey].push(`${header}: ${ruleName} - ${reasonText}`);
        });
      });
      const reasonsDisplay: Record<string, string> = {};
      Object.entries(reasons).forEach(([rowKey, reasonArr]) => {
        reasonsDisplay[rowKey] = reasonArr.join('; ');
      });

      setGenericErrorLocations(newErrorLocations);
      setGenericDataRows(normalizedDataRows);
      setGenericErrorReasons(reasonsDisplay);

      setGenericRulesApplied(new Set(Object.values(validations).flat()).size);
      setGenericErrorsDetected(Object.values(newErrorLocations).reduce((sum, arr) => sum + arr.length, 0));
    } catch (error: any) {
      console.error('Error fetching generic correction data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch generic validation errors.',
        variant: 'destructive',
      });
    } finally {
      setFetchingErrors(false);
      setHasFetchedCorrectionData(true);
    }
  };

const validateCorrectionInput = async (header: string, rowIndex: number, value: string): Promise<boolean> => {
  try {
    const rules = validations[header] || [];
    let isValid = true;
    let toastConfig = null;

    // Handle empty values first
    if (!value || value.trim() === '' || value === 'NULL') {
      if (rules.includes('Required')) {
        toastConfig = ValidationToastMessages.Required;
        isValid = false;
      } else {
        // Remove any existing error for this field
        const updatedErrors = { ...correctionValidationErrors };
        if (updatedErrors[header]) {
          delete updatedErrors[header][rowIndex.toString()];
          if (Object.keys(updatedErrors[header]).length === 0) {
            delete updatedErrors[header];
          }
        }
        setCorrectionValidationErrors(updatedErrors);
        return true;
      }
    }

    // Validate each rule if value is not empty
    if (isValid && value && value.trim() !== '') {
      for (const rule of rules) {
        if (!isValid) break;
        
        const customRule = customRules.find((r) => r.rule_name === rule);
        if (customRule) {
          try {
            const response = await apiService.validateColumnRules(Number(templateId));
            const errors = response.data.errors[rule] || [];
            const rowError = errors.find((err: any) => err.row === rowIndex + 1 && err.value === value);
            if (rowError) {
              isValid = false;
              toastConfig = ValidationToastMessages.Custom.failed(rule);
            }
          } catch (error: any) {
            isValid = false;
            toastConfig = ValidationToastMessages.General.validation;
          }
        } else {
          switch (rule) {
            case 'Required':
              // Already handled above
              break;
              
            case 'Int':
              if (!/^-?\d+$/.test(value)) {
                isValid = false;
                if (value.includes('.')) {
                  toastConfig = ValidationToastMessages.Int.decimal;
                } else if (/[a-zA-Z]/.test(value)) {
                  toastConfig = ValidationToastMessages.Int.text;
                } else {
                  toastConfig = ValidationToastMessages.Int.special;
                }
              }
              break;
              
            case 'Float':
              if (!/^-?\d*\.?\d+$/.test(value)) {
                isValid = false;
                if (/[a-zA-Z]/.test(value)) {
                  toastConfig = ValidationToastMessages.Float.text;
                } else if ((value.match(/\./g) || []).length > 1) {
                  toastConfig = ValidationToastMessages.Float.multipleDecimals;
                } else {
                  toastConfig = ValidationToastMessages.Float.text;
                }
              }
              break;
              
            case 'Email':
              const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              if (!emailRegex.test(value)) {
                isValid = false;
                if (value.includes(',')) {
                  toastConfig = ValidationToastMessages.Email.domain;
                } else {
                  toastConfig = ValidationToastMessages.Email.invalid;
                }
              }
              break;
              
            case 'Text':
              if (has_special_characters_except_quotes_and_parenthesis(value)) {
                isValid = false;
                if (/\d/.test(value)) {
                  toastConfig = ValidationToastMessages.Text.numbers;
                } else {
                  toastConfig = ValidationToastMessages.Text.special;
                }
              }
              break;
              
            case 'Boolean':
              if (!/^(true|false|0|1)$/i.test(value)) {
                isValid = false;
                toastConfig = ValidationToastMessages.Boolean.invalid;
              }
              break;
              
            case 'Alphanumeric':
              if (!/^[a-zA-Z0-9]+$/.test(value)) {
                isValid = false;
                if (/\s/.test(value)) {
                  toastConfig = ValidationToastMessages.Alphanumeric.spaces;
                } else {
                  toastConfig = ValidationToastMessages.Alphanumeric.special;
                }
              }
              break;
              
            default:
              // Handle Date rules
              if (rule.startsWith('Date(')) {
                const sourceFormat = sourceFormats[header];
                if (!sourceFormat) {
                  isValid = false;
                  toastConfig = ValidationToastMessages.General.validation;
                  break;
                }
                
                const dateValidation = validateDateFormatEnhanced(value, sourceFormat);
                if (!dateValidation.isValid) {
                  isValid = false;
                  toastConfig = dateValidation.toastConfig;
                }
              }
              break;
          }
        }
      }
    }

    // Update validation errors state
    const updatedErrors = { ...correctionValidationErrors };
    if (!isValid && toastConfig) {
      if (!updatedErrors[header]) updatedErrors[header] = {};
      updatedErrors[header][rowIndex.toString()] = toastConfig.message;
      
      // Show toast message
      toast({
        title: toastConfig.title,
        description: toastConfig.message,
        variant: 'destructive',
      });
    } else {
      // Remove error if validation passes
      if (updatedErrors[header]) {
        delete updatedErrors[header][rowIndex.toString()];
        if (Object.keys(updatedErrors[header]).length === 0) {
          delete updatedErrors[header];
        }
      }
    }
    
    setCorrectionValidationErrors(updatedErrors);
    
    // Update hasValidationErrors state
    const hasErrors = Object.keys(updatedErrors).some(h => 
      Object.keys(updatedErrors[h]).length > 0
    );
    setHasValidationErrors(hasErrors);

    return isValid;
  } catch (error) {
    console.error('Error validating correction input:', error);
    toast({
      title: ValidationToastMessages.General.validation.title,
      description: ValidationToastMessages.General.validation.message,
      variant: 'destructive',
    });
    return false;
  }
};

// Enhanced date validation function
const validateDateFormatEnhanced = (value: string, sourceFormat: string) => {
  const datePatterns = {
    'DD-MM-YYYY': /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
    'MM-DD-YYYY': /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/,
    'MM/DD/YYYY': /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/,
    'DD/MM/YYYY': /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
    'MM-YYYY': /^(0[1-9]|1[0-2])-\d{4}$/,
    'MM-YY': /^(0[1-9]|1[0-2])-\d{2}$/,
    'MM/YYYY': /^(0[1-9]|1[0-2])\/\d{4}$/,
    'MM/YY': /^(0[1-9]|1[0-2])\/\d{2}$/
  };

  const pattern = datePatterns[sourceFormat as keyof typeof datePatterns];
  if (!pattern) {
    return {
      isValid: false,
      toastConfig: ValidationToastMessages.General.validation
    };
  }

  if (!pattern.test(value)) {
    const expectedLength = getDateExample(sourceFormat).length;
    const separator = sourceFormat.includes('/') ? '/' : '-';
    
    if (value.length !== expectedLength) {
      return {
        isValid: false,
        toastConfig: ValidationToastMessages.Date.incomplete(sourceFormat)
      };
    }
    
    if (!value.includes(separator)) {
      return {
        isValid: false, 
        toastConfig: ValidationToastMessages.Date.separator(sourceFormat)
      };
    }
    
    return {
      isValid: false,
      toastConfig: ValidationToastMessages.Date.format(sourceFormat)
    };
  }

  return { isValid: true, toastConfig: null };
};

  const fetchCustomCorrectionData = async () => {
    try {
      setFetchingCustomErrors(true);
      const response = await apiService.validateCustomTemplate(Number(templateId), true);
      if (!response.data.success) {
        throw new Error('Failed to load custom validation errors');
      }
      const newErrorLocations = response.data.error_cell_locations || {};
      const newDataRows = response.data.data_rows || [];

      // Normalize data rows (similar to generic)
      const normalizedDataRows = newDataRows.map((row: any) => {
        const normalizedRow = { ...row };
        Object.keys(normalizedRow).forEach((key) => {
          if (normalizedRow[key] === null || normalizedRow[key] === undefined || normalizedRow[key] === 'NULL') {
            normalizedRow[key] = 'NULL';
          }
        });
        return normalizedRow;
      });

      // Aggregate reasons (similar to generic)
      const reasons: Record<string, string[]> = {};
      Object.entries(newErrorLocations).forEach(([header, errors]: [string, ErrorLocation[]]) => {
        errors.forEach((error: ErrorLocation) => {
          const rowIndex = error.row - 1;
          const rowKey = rowIndex.toString();
          if (!reasons[rowKey]) reasons[rowKey] = [];
          reasons[rowKey].push(`${header}: ${error.rule_failed} - ${error.reason}`);
        });
      });
      const reasonsDisplay: Record<string, string> = {};
      Object.entries(reasons).forEach(([rowKey, reasonArr]) => {
        reasonsDisplay[rowKey] = reasonArr.join('; ');
      });

      setCustomErrorLocations(newErrorLocations);
      setCustomDataRows(normalizedDataRows);
      setCustomErrorReasons(reasonsDisplay);
      setLocalDataRows([...normalizedDataRows]);

      setCustomRulesApplied(customRules.length);  // Adjust if using checkedCustomRules
      setCustomErrorsDetected(Object.values(newErrorLocations).reduce((sum, arr) => sum + arr.length, 0));

      // Initialize rowValidity
      const initialValidity: Record<string, boolean> = {};
      Object.keys(reasonsDisplay).forEach((rowKey) => {
        initialValidity[rowKey] = false;
      });
      setRowValidity(initialValidity);
    } catch (error: any) {
      console.error('Error fetching custom correction data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch custom validation errors.',
        variant: 'destructive',
      });
    } finally {
      setFetchingCustomErrors(false);
      setHasFetchedCustom(true);
    }
  };

  const handleCustomCorrectionChange = async (header: string, rowIndex: number, value: string) => {
    // Update local data immediately for UI responsiveness
    const updatedLocalRows = [...localDataRows];
    updatedLocalRows[rowIndex][header] = value;
    setLocalDataRows(updatedLocalRows);

    const updatedCustomCorrections = { ...customCorrections };
    if (!updatedCustomCorrections[header]) updatedCustomCorrections[header] = {};
    updatedCustomCorrections[header][rowIndex.toString()] = value;
    setCustomCorrections(updatedCustomCorrections);

    try {
      setValidatingRow(true);
      // Validate the entire row with updated data
      const response = await apiService.validateRow(Number(templateId), rowIndex, updatedLocalRows[rowIndex], true);

      const rowKey = rowIndex.toString();
      
      if (response.data.valid) {
        // Row is now valid - update UI to show success
        const newValidity = { ...rowValidity, [rowKey]: true };
        setRowValidity(newValidity);

        // Remove error reasons for this row
        const newErrorReasons = { ...customErrorReasons };
        delete newErrorReasons[rowKey];
        setCustomErrorReasons(newErrorReasons);

        // Update error locations - remove errors for this row but keep row visible
        const newCustomErrorLocations = { ...customErrorLocations };
        Object.keys(newCustomErrorLocations).forEach((col) => {
          // Keep the row but mark as resolved
          newCustomErrorLocations[col] = newCustomErrorLocations[col].map((err) => 
            err.row === rowIndex + 1 ? { ...err, resolved: true } : err
          );
        });
        setCustomErrorLocations(newCustomErrorLocations);
      } else {
        // Row still has errors - update with new error information
        const newValidity = { ...rowValidity, [rowKey]: false };
        setRowValidity(newValidity);

        const newErrorReasons = { ...customErrorReasons };
        newErrorReasons[rowKey] = response.data.errors
          .map((e: any) => `${e.column}: ${e.rule_failed} - ${e.reason}`)
          .join('; ');
        setCustomErrorReasons(newErrorReasons);

        // Update error locations with new error info
        const newCustomErrorLocations = { ...customErrorLocations };
        response.data.errors.forEach((error: any) => {
          if (!newCustomErrorLocations[error.column]) {
            newCustomErrorLocations[error.column] = [];
          }
          
          // Update or add error for this cell
          const existingErrorIndex = newCustomErrorLocations[error.column]
            .findIndex((err) => err.row === rowIndex + 1);
          
          const errorObj = {
            row: rowIndex + 1,
            value: updatedLocalRows[rowIndex][error.column],
            rule_failed: error.rule_failed,
            reason: error.reason,
            resolved: false
          };

          if (existingErrorIndex >= 0) {
            newCustomErrorLocations[error.column][existingErrorIndex] = errorObj;
          } else {
            newCustomErrorLocations[error.column].push(errorObj);
          }
        });
        setCustomErrorLocations(newCustomErrorLocations);
      }
    } catch (error: any) {
      console.error('Error validating custom correction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to validate correction.',
        variant: 'destructive',
      });
    } finally {
      setValidatingRow(false);
    }
  };

  const validateRules = (): boolean => {
    const allowedRules = ['Text', 'Int', 'Float', 'Email', 'Date', 'Boolean', 'Alphanumeric'];
    console.log('Validating rules with validations state:', validations);
    for (const header of selectedHeaders) {
      const rules = validations[header] || [];
      console.log(`Header: ${header}, Applied rules:`, rules);
      if (!rules.includes('Required')) {
        console.log(`Validation failed for ${header}: Missing 'Required' rule`);
        toast({
          title: 'Validation Error',
          description: "'Required' rule is mandatory for each column.",
          variant: 'destructive',
        });
        return false;
      }
      const additionalRules = rules.filter((rule) =>
        allowedRules.includes(rule) || rule.startsWith('Date(')
      );
      console.log(`Header: ${header}, Additional rules:`, additionalRules);
      if (additionalRules.length !== 1) {
        console.log(`Validation failed for ${header}: Expected 1 additional rule, found ${additionalRules.length}`);
        toast({
          title: 'Validation Error',
          description: "Please select exactly one of 'Text', 'Int', 'Float', 'Email', 'Date', 'Boolean', 'Alphanumeric' and 'Required' is mandatory.",
          variant: 'destructive',
        });
        return false;
      }
    }
    console.log('All validations passed');
    return true;
  };

  const validateCorrection = async (header: string, row: number, value: string): Promise<boolean> => {
    const rules = validations[header] || [];
    let isValid = true;
    let errorMessage = '';

    for (const rule of rules) {
      if (!isValid) break;
      const customRule = customRules.find((r) => r.rule_name === rule);
      if (customRule) {
        try {
          const response = await apiService.validateColumnRules(Number(templateId));
          const errors = response.data.errors[rule] || [];
          const rowError = errors.find((err: any) => err.row === row + 1 && err.value === value);
          if (rowError) {
            isValid = false;
            errorMessage = rowError.reason;
          }
        } catch (error: any) {
          console.error(`Error validating custom rule ${rule}:`, error);
          isValid = false;
          errorMessage = `Failed to validate custom rule '${rule}'`;
        }
      } else {
        switch (true) {
          case rule === 'Required':
            if (!value || value.trim() === '' || value === 'NULL') {
              isValid = false;
              errorMessage = 'Value is required';
            }
            break;
          case rule === 'Int':
            if (value && !/^-?\d+$/.test(value)) {
              isValid = false;
              errorMessage = 'Value must be an integer';
            }
            break;
          case rule === 'Float':
            if (value && !/^-?\d*\.?\d+$/.test(value)) {
              isValid = false;
              errorMessage = 'Value must be a number (integer or decimal)';
            }
            break;
          case rule === 'Email':
            const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA.Z0-9-.]+$/;
            if (value && !emailRegex.test(value)) {
              isValid = false;
              errorMessage = 'Invalid email format';
            }
            break;
          case rule.startsWith('Date('):
            const sourceFormat = sourceFormats[header];
            if (!sourceFormat) {
              isValid = false;
              errorMessage = 'No source format defined for date';
              break;
            }
            const formatMap = {
              'MM-DD-YYYY': '\\d{2}-\\d{2}-\\d{4}',
              'DD-MM-YYYY': '\\d{2}-\\d{2}-\\d{4}',
              'MM/DD/YYYY': '\\d{2}/\\d{2}/\\d{4}',
              'DD/MM/YYYY': '\\d{2}/\\d{2}/\\d{4}',
              'MM-YYYY': '\\d{2}-\\d{4}',
              'MM-YY': '\\d{2}-\\d{2}',
              'MM/YYYY': '\\d{2}/\\d{4}',
              'MM/YY': '\\d{2}/\\d{2}'
            };
            const dateRegex = new RegExp(`^${formatMap[sourceFormat]}$`);
            if (value && !dateRegex.test(value)) {
              isValid = false;
              errorMessage = `Invalid date format (expected ${sourceFormat})`;
            }
            break;
          case rule === 'Text':
            const hasSpecial = /[^a-zA-Z\s"()]/g.test(value);
            if (value && hasSpecial) {
              isValid = false;
              errorMessage = 'Only letters, spaces, quotes, and parentheses are allowed';
            }
            break;
          case rule === 'Boolean':
            if (value && !/^(true|false|0|1)$/i.test(value)) {
              isValid = false;
              errorMessage = 'Value must be a boolean (true/false or 0/1)';
            }
            break;
          case rule === 'Alphanumeric':
            if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
              isValid = false;
              errorMessage = `Only alphanumeric characters are allowed; found invalid characters: ${value.replace(/[a-zA-Z0-9]/g, '')}`;
            }
            break;
        }
      }
    }

    if (!isValid) {
      toast({ title: 'Validation Error', description: errorMessage, variant: 'destructive' });
    }

    return isValid;
  };

  const handleValidateCorrected = async () => {
    setValidationLoading(true);
    try {
      // Ensure corrections are saved and corrected file path is available
      let filePath = correctedFilePath;
      if (!filePath) {
        console.log('No corrected file path, saving corrections...');
        filePath = await handleValidateExisting();
        if (!filePath) {
          throw new Error('Failed to generate corrected file for validation. Please reapply corrections in Step 2.');
        }
        setCorrectedFilePath(filePath);
      }

      const response = await apiService.validateCorrectedTemplate(Number(templateId));
      console.log('validateCorrectedTemplate response:', JSON.stringify(response.data, null, 2));

      // Store validation results
      setValidationResults(response.data.results || []);
      setValidationCompleted(true);

      if (!response.data.success) {
        const errorDetails = response.data.results
          .filter((result: any) => result.errors.length > 0)
          .map((result: any) =>
            result.errors.map((err: any) =>
              `Row ${err.row}, Column ${result.column_name}: Rule "${result.rule_name}" failed - ${err.reason}`
            )
          )
          .flat()
          .join('; ');
        toast({
          title: 'Validation Error',
          description: errorDetails || response.data.message || 'Validation failed with errors',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Corrected template validated successfully .',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Error in handleValidateCorrected:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to validate corrected template';
      toast({
        title: 'Validation Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setValidationCompleted(true); // Allow download even if validation fails
      setValidationResults(error.response?.data?.results || []);
      if (errorMessage.includes('No validation rules configured')) {
        if (window.confirm('No validation rules configured. Would you like to configure rules now?')) {
          navigate(`/validate/${templateId}?step=2&from=rule-configurations`);
        }
      } else if (errorMessage.includes('Please reapply corrections') || errorMessage.includes('Session data missing')) {
        if (window.confirm('Corrections or session data missing. Would you like to reapply corrections in Step 2?')) {
          navigate(`/validate/${templateId}?step=5&from=${fromRoute || 'data-validations'}`);
        }
      }
    } finally {
      setValidationLoading(false);
    }
  };

  const handleDownloadValidationReport = async () => {
    try {
      // Ensure corrections are saved before downloading the report
      let filePath = correctedFilePath;
      if (!filePath) {
        console.log('No corrected file path, saving corrections...');
        filePath = await handleValidateExisting();
        if (!filePath) {
          throw new Error('Failed to generate corrected file for validation report.');
        }
        setCorrectedFilePath(filePath);
      }

      console.log('Downloading validation report for templateId:', templateId);
      await apiService.downloadValidationReport(Number(templateId));
      toast({
        title: 'Success',
        description: 'Validation report download initiated.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error downloading validation report:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to download validation report.',
        variant: 'destructive',
      });
    }
  };

  const handleStepSubmit = async (step: number, data: any, action: string = 'save') => {
    try {
      let response;
      switch (step) {
        case 1:
          response = await apiService.submitStepOne({
            headers: data?.headers || selectedHeaders,
            new_header_row: data?.new_header_row,
          });
          if (response.data.success) {
            setSelectedHeaders(data.headers);
            setValidations(response.data.validations || {}); // Set auto-assigned validations
            setCurrentStep(2);
            setIsReviewMode(false);
            navigate(`/validate/${templateId}?step=2${fromRoute ? `&from=${fromRoute}` : ''}`);
          }
          break;
        case 2:
          if (action === 'review' && !validateRules()) return;
          response = await apiService.submitStepTwo({
            validations: data?.validations || validations,
            action: action,
          });
          if (response.data.success) {
            if (action === 'save') {
              toast({ title: 'Success', description: 'Rules saved successfully', variant: 'default' });
              const templatesResponse = await apiService.getRuleConfigurations();
              navigate(fromRoute === 'rule-configurations' ? '/rule-configurations' : '/dashboard', {
                state: { updatedTemplates: templatesResponse.data.templates },
              });
            } else if (action === 'review') {
              toast({ title: 'Success', description: 'Validation rules saved. Moving to review.', variant: 'default' });
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
      toast({ title: `Step ${step} Error`, description: error.response?.data?.error || `Failed to complete step ${step}.`, variant: 'destructive' });
    }
  };

  const handleValidateExisting = async () => {
    try {
      console.log('Saving corrections for templateId:', templateId, 'corrections:', corrections);
      const response = await apiService.saveExistingTemplateCorrections(Number(templateId), corrections);
      console.log('saveExistingTemplateCorrections response:', response.data);
      
      if (!response.data.success || !response.data.corrected_file_path) {
        console.error('No corrected_file_path returned or request failed:', response.data);
        throw new Error(response.data.message || 'Failed to save corrections');
      }
      
      toast({ title: 'Success', description: 'Corrections saved successfully', variant: 'default' });
      setCorrectedFilePath(response.data.corrected_file_path);
      return response.data.corrected_file_path;
    } catch (error: any) {
      console.error('Error in handleValidateExisting:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save corrections';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleValidationChange = (header: string, rule: string, checked: boolean) => {
    console.log(`handleValidationChange: header=${header}, rule=${rule}, checked=${checked}`);
    const newValidations = { ...validations };
    if (!newValidations[header]) newValidations[header] = ['Required'];

    const genericRules = ['Int', 'Float', 'Text', 'Email', 'Boolean', 'Alphanumeric'];

    if (checked) {
      if (genericRules.includes(rule) || rule.startsWith('Date(')) {
        const existingGenericRules = newValidations[header].filter((r) => genericRules.includes(r) || r.startsWith('Date('));
        if (existingGenericRules.length > 0) {
          console.log(`Validation error: ${header} already has generic rule(s):`, existingGenericRules);
          toast({
            title: 'Validation Error',
            description: 'Only one generic rule is allowed per column.',
            variant: 'destructive',
          });
          return;
        }
      }
      if (!newValidations[header].includes(rule)) {
        newValidations[header].push(rule);
      }
      console.log(`Added rule ${rule} to ${header}. New validations:`, newValidations[header]);
    } else if (rule !== 'Required') {
      newValidations[header] = newValidations[header].filter((r) => r !== rule);
      if (!newValidations[header].includes('Required')) {
        newValidations[header].unshift('Required');
      }
      console.log(`Removed rule ${rule} from ${header}. New validations:`, newValidations[header]);
    } else {
      console.log(`Cannot remove 'Required' rule from ${header}`);
      toast({
        title: 'Validation Error',
        description: "'Required' rule cannot be removed.",
        variant: 'destructive',
      });
      return;
    }
    setValidations(newValidations);
  };

  const handleCorrectionChange = async (header: string, row: number, value: string) => {
    const isValid = await validateCorrection(header, row, value);
    setCorrections((prev) => {
      const newCorrections = { ...prev };
      if (!newCorrections[header]) newCorrections[header] = {};
      newCorrections[header][row.toString()] = value;
      return newCorrections;
    });
    setCorrectionValidity((prev) => {
      const newValidity = { ...prev };
      if (!newValidity[header]) newValidity[header] = {};
      newValidity[header][row.toString()] = isValid;
      return newValidity;
    });
  };

  const allErrorsCorrected = () => {
    return Object.entries(errorLocations).every(([header, errors]) =>
      errors.every((error: ErrorLocation) => {
        const row = (error.row - 1).toString();
        return (
          correctionValidity[header]?.[row] === true &&
          corrections[header]?.[row] !== undefined &&
          corrections[header][row] !== ''
        );
      })
    );
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const header = destination.droppableId.replace('applied-', '');
    const isAppliedDroppable = destination.droppableId.startsWith('applied-');
    const isAvailableDroppable = source.droppableId === 'available-rules';
    const isTemplateCustomDroppable = source.droppableId === 'template-custom-rules';
    const isTransformationDroppable = source.droppableId === 'transformation-rules';

    console.log(`onDragEnd: source=${source.droppableId}, destination=${destination.droppableId}, header=${header}`);

    if (isAppliedDroppable && (isAvailableDroppable || isTemplateCustomDroppable || isTransformationDroppable)) {
      const ruleList = isAvailableDroppable ? basicRules : isTransformationDroppable ? [{ rule_name: 'Transform-Date', rule_id: 999, is_custom: true, data_type: 'Date' }] : customRules;
      const ruleObj = ruleList[source.index];
      const rule = ruleObj.rule_name;

      console.log(`Applying rule ${rule} to header ${header}`);

      if (rule === 'Date') {
        setDateFormatDialog({ open: true, header, rule: 'Date', format: '' });
        return;
      } else if (rule === 'Transform-Date') {
        if (!validations[header]?.some(r => r.startsWith('Date('))) {
          toast({
            title: 'Validation Error',
            description: "'Transform-Date' can only be applied to columns with a 'Date' rule.",
            variant: 'destructive',
          });
          return;
        }
        setDateFormatDialog({ open: true, header, rule: 'Transform-Date', format: '' });
        return;
      }

      const genericRules = ['Int', 'Float', 'Text', 'Email', 'Boolean', 'Alphanumeric'];
      if (isAvailableDroppable && genericRules.includes(rule)) {
        const existingGenericRules = (validations[header] || []).filter((r) => genericRules.includes(r) || r.startsWith('Date('));
        if (existingGenericRules.length > 0) {
          console.log(`Validation error: ${header} already has generic rule(s):`, existingGenericRules);
          toast({
            title: 'Validation Error',
            description: 'Only one generic rule is allowed per column.',
            variant: 'destructive',
          });
          return;
        }
      }

      handleValidationChange(header, rule, true);

      if (isTemplateCustomDroppable) {
        setCheckedCustomRules((prev) => ({
          ...prev,
          [ruleObj.rule_id!]: true,
        }));
        console.log(`Checked custom rule ${rule} for header ${header}`);
      }
    } else if (isAppliedDroppable && source.droppableId === destination.droppableId) {
      const newRules = [...(validations[header] || []).filter((r) => r !== 'Required')];
      const [reorderedRule] = newRules.splice(source.index, 1);
      newRules.splice(destination.index, 0, reorderedRule);
      setValidations({ ...validations, [header]: ['Required', ...newRules] });
      console.log(`Reordered rules for ${header}:`, ['Required', ...newRules]);
    } else if (
      source.droppableId.startsWith('applied-') &&
      (destination.droppableId === 'available-rules' || destination.droppableId === 'template-custom-rules' || destination.droppableId === 'transformation-rules')
    ) {
      const sourceHeader = source.droppableId.replace('applied-', '');
      const rule = (validations[sourceHeader] || []).filter((r) => r !== 'Required')[source.index];
      if (rule) {
        handleValidationChange(sourceHeader, rule, false);
        const customRule = customRules.find((r) => r.rule_name === rule);
        if (customRule) {
          setCheckedCustomRules((prev) => ({
            ...prev,
            [customRule.rule_id!]: false,
          }));
          console.log(`Unchecked custom rule ${rule} for header ${sourceHeader}`);
        }
      }
    }
  };

  const validateInput = (header: string, value: string): boolean => {
    const rules = validations[header] || [];
    let isValid = true;
    let errorMessage = '';

    rules.forEach((rule) => {
      if (!isValid) return;
      const customRule = customRules.find((r) => r.rule_name === rule);
      if (customRule) {
        errorMessage = `Custom rule '${rule}' requires backend validation`;
        isValid = false;
      } else {
        switch (true) {
          case rule === 'Required':
            if (!value || value.trim() === '' || value === 'NULL') {
              isValid = false;
              errorMessage = 'Value is required';
            }
            break;
          case rule === 'Int':
            if (value && !/^-?\d+$/.test(value)) {
              isValid = false;
              errorMessage = 'Value must be an integer';
            }
            break;
          case rule === 'Float':
            if (value && !/^-?\d*\.?\d+$/.test(value)) {
              isValid = false;
              errorMessage = 'Value must be a number (integer or decimal)';
            }
            break;
          case rule === 'Email':
            const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA.Z0-9-]+\.[a-zA.Z0-9-.]+$/;
            if (value && !emailRegex.test(value)) {
              isValid = false;
              errorMessage = 'Invalid email format';
            }
            break;
          case rule.startsWith('Date('):
            const sourceFormat = sourceFormats[header];
            if (!sourceFormat) {
              isValid = false;
              errorMessage = 'No source format defined for date';
              break;
            }
            const formatMap = {
              'MM-DD-YYYY': '\\d{2}-\\d{2}-\\d{4}',
              'DD-MM-YYYY': '\\d{2}-\\d{2}-\\d{4}',
              'MM/DD/YYYY': '\\d{2}/\\d{2}/\\d{4}',
              'DD/MM/YYYY': '\\d{2}/\\d{2}/\\d{4}',
              'MM-YYYY': '\\d{2}-\\d{4}',
              'MM-YY': '\\d{2}-\\d{2}',
              'MM/YYYY': '\\d{2}/\\d{4}',
              'MM/YY': '\\d{2}/\\d{2}'
            };
            const dateRegex = new RegExp(`^${formatMap[sourceFormat]}$`);
            if (value && !dateRegex.test(value)) {
              isValid = false;
              errorMessage = `Invalid date format (expected ${sourceFormat})`;
            }
            break;
          case rule === 'Text':
            const hasSpecial = /[^a-zA-Z\s"()]/g.test(value);
            if (value && hasSpecial) {
              isValid = false;
              errorMessage = 'Only letters, spaces, quotes, and parentheses are allowed';
            }
            break;
          case rule === 'Boolean':
            if (value && !/^(true|false|0|1)$/i.test(value)) {
              isValid = false;
              errorMessage = 'Value must be a boolean (true/false or 0/1)';
            }
            break;
          case rule === 'Alphanumeric':
            if (value && !/^[a-zA-Z0-9]+$/.test(value)) {
              isValid = false;
              errorMessage = `Only alphanumeric characters are allowed; found invalid characters: ${value.replace(/[a-zA-Z0-9]/g, '')}`;
            }
            break;
        }
      }
    });

    if (!isValid) {
      console.log(`Validation failed for ${header}: ${errorMessage}`);
      toast({ title: 'Validation Error', description: errorMessage, variant: 'destructive' });
    }

    return isValid;
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      let filePath = correctedFilePath;
      console.log('Attempting to download file:', filePath);
      
      if (!filePath) {
        console.log('No corrected file path available, saving corrections...');
        filePath = await handleValidateExisting();
        if (!filePath) {
          console.error('Failed to generate corrected file path');
          throw new Error('Failed to generate corrected file.');
        }
        setCorrectedFilePath(filePath);
      }

      const correctedFilename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      console.log('Filename for download:', correctedFilename);

      const response = await apiService.downloadFile(correctedFilename);
      const blob = new Blob([response], { type: response.type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', correctedFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({ title: 'Success', description: 'File downloaded successfully.', variant: 'default' });

      if (fromRoute === 'data-validations') {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error in handleDownload:', error.response || error.message);
      let errorMessage = 'Failed to download corrected file.';
      if (error.response?.data) {
        try {
          // If the error response is a blob, convert it to text
          const text = await error.response.data.text();
          const parsedError = JSON.parse(text);
          errorMessage = parsedError.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

const handleApplyTransformation = async () => {
  setTransformationLoading(true);
  try {
    if (!targetFormats || Object.keys(targetFormats).length === 0) {
      toast({
        title: 'Info',
        description: 'No transformation rules found to apply.',
        variant: 'default',
      });
      setTransformationLoading(false);
      return;
    }

    // Apply transformation on backend
    const response = await apiService.applyTransformationRules(Number(templateId));
    
    if (response.data.success) {
      setTransformationApplied(true);
      setTransformedFilePath(response.data.transformed_file_path || null);
      
      // UPDATE THE UI DATA IMMEDIATELY by applying transformations to current data
      const updatedRows = transformationDataRows.map(row => {
        const newRow = { ...row };
        
        // Apply transformations to date columns in the UI
        Object.entries(targetFormats || {}).forEach(([column, targetFormat]) => {
          if (newRow[column] && sourceFormats[column] && newRow[column] !== 'NULL') {
            // Apply the transformation using the transformDateInUI function
            const originalValue = newRow[column];
            const transformedValue = transformDateInUI(originalValue, sourceFormats[column], targetFormat);
            newRow[column] = transformedValue;
            
            console.log(`Transformed ${column}: ${originalValue} -> ${transformedValue}`);
          }
        });
        
        return newRow;
      });
      
      setTransformationDataRows(updatedRows);
      
      toast({
        title: 'Success',
        description: `Transformation applied! Date formats changed in ${Object.keys(targetFormats).length} columns.`,
        variant: 'default',
      });
    } else {
      throw new Error(response.data.message || 'Failed to apply transformation rules');
    }
  } catch (error: any) {
    console.error('Error applying transformation rules:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to apply transformation rules.',
      variant: 'destructive',
    });
  } finally {
    setTransformationLoading(false);
  }
};


const transformDateInUI = (dateString: string, sourceFormat: string, targetFormat: string): string => {
  if (!dateString || dateString === 'NULL' || !sourceFormat || !targetFormat) {
    return dateString;
  }
  
  try {
    // Parse date based on source format
    let day: number, month: number, year: number;
    
    if (sourceFormat.includes('/')) {
      const parts = dateString.split('/');
      if (sourceFormat === 'MM/DD/YYYY') {
        month = parseInt(parts[0]);
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else if (sourceFormat === 'DD/MM/YYYY') {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }
    } else if (sourceFormat.includes('-')) {
      const parts = dateString.split('-');
      if (sourceFormat === 'MM-DD-YYYY') {
        month = parseInt(parts[0]);
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else if (sourceFormat === 'DD-MM-YYYY') {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }
    }
    
    // Format to target format
    const dayStr = day!.toString().padStart(2, '0');
    const monthStr = month!.toString().padStart(2, '0');
    const yearStr = year!.toString();
    
    if (targetFormat === 'MM-DD-YYYY') {
      return `${monthStr}-${dayStr}-${yearStr}`;
    } else if (targetFormat === 'DD-MM-YYYY') {
      return `${dayStr}-${monthStr}-${yearStr}`;
    } else if (targetFormat === 'MM/DD/YYYY') {
      return `${monthStr}/${dayStr}/${yearStr}`;
    } else if (targetFormat === 'DD/MM/YYYY') {
      return `${dayStr}/${monthStr}/${yearStr}`;
    }
    
    return dateString;
  } catch (error) {
    console.error('Date transformation error:', error);
    return dateString;
  }
};

const reloadTransformedData = async () => {
  try {
    // Get the transformed file data from backend
    const response = await apiService.getTransformedData(Number(templateId));
    if (response.data.success) {
      setTransformationDataRows(response.data.data_rows || []);
    }
  } catch (error) {
    console.warn('Could not reload transformed data:', error);
  }
};

const handleDownloadTransformedFile = async () => {
  try {
    if (!transformationApplied) {
      toast({
        title: 'Warning',
        description: 'Please apply transformation rules first.',
        variant: 'default',
      });
      return;
    }
    
    await apiService.downloadTransformedFile(Number(templateId));
    toast({
      title: 'Success',
      description: 'Transformed file download initiated.',
      variant: 'default',
    });
  } catch (error: any) {
    console.error('Error downloading transformed file:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to download transformed file.',
      variant: 'destructive',
    });
  }
};

const handleSaveAndReview = async () => {
  try {
    const filePath = await handleValidateExisting();
    if (!filePath) throw new Error('Failed to save corrections.');
    setCorrectedFilePath(filePath);
    setCurrentStep(7);
    navigate(`/validate/${templateId}?step=7${fromRoute ? `&from=${fromRoute}` : ''}`);
    toast({ title: 'Success', description: 'Corrections saved. Moving to review.', variant: 'default' });
  } catch (error: any) {
    toast({ title: 'Error', description: error.message || 'Failed to save corrections.', variant: 'destructive' });
  }
};

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    const fetchTemplate = async () => {
      try {
        const response = await apiService.getTemplate(Number(templateId), sheetName || 'Sheet1');
        const data = response.data as TemplateResponse;
        const actualSheetName = data.sheet_name;
        if (!actualSheetName || !data.sheets || !data.sheets[actualSheetName]) {
          throw new Error('Sheet data not found in the response.');
        }
        setSheetName(actualSheetName);
        setFileName(data.file_name);
        const fetchedHeaders = data.sheets[actualSheetName].headers;
        if (!fetchedHeaders || fetchedHeaders.length === 0) {
          throw new Error('No headers found in the file.');
        }
        setHeaders(fetchedHeaders);
        setCurrentStep(1);
        setIsReviewMode(false);
        setHasExistingRules(data.has_existing_rules || false);
        initialFetchDone.current = false;
      } catch (error: any) {
        setError(error.response?.data?.error || error.message || 'Failed to load template headers.');
        toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  };

  // Functional steps for navigation and rendering
const steps = fromRoute === 'rule-configurations'
  ? [
      { step: 1, label: 'Select Column Headers' },
      { step: 2, label: 'Configure Rules' },
      { step: 3, label: 'Review Configured Rules' },
    ]
  : [
      { step: 1, label: 'Step 1 - Select Column Headers' },
      { step: 2, label: 'Step 2 - Configure Rules' },
      { step: 3, label: 'Step 3 - Review Configured Rules' },
      { step: 4, label: 'Step 1 - Error Detection' },
      { step: 5, label: 'Step 2 - Error Correction' },
      { step: 6, label: 'Step 3 - Custom Error Detection & Correction' },
      { step: 7, label: 'Step 4 - Master Data Validation' },
      { step: 8, label: 'Step 5 - Transformation Rules' }, // MOVED HERE
      { step: 9, label: 'Step 6 - Validation Summary' }, // NOW STEP 9
    ];

const displaySteps = fromRoute === 'rule-configurations'
  ? [
      { step: 1, label: 'Step 1 - Select Column Headers' },
      { step: 2, label: 'Step 2 - Configure Rules' },
      { step: 3, label: 'Step 3 - Review Configured Rules' },
    ]
  : currentStep <= 3
  ? [
      { step: 1, label: 'Step 1 - Select Column Headers' },
      { step: 2, label: 'Step 2 - Configure Rules' },
      { step: 3, label: 'Step 3 - Review Configured Rules' },
    ]
  : [
      { step: 1, label: 'Step 1 - Error Detection' },
      { step: 2, label: 'Step 2 - Error Correction' },
      { step: 3, label: 'Step 3 - Custom Error Detection & Correction' },
      { step: 4, label: 'Step 4 - Master Data Errors' },
      { step: 5, label: 'Step 5 - Transformation Rules' }, // MOVED HERE
      { step: 6, label: 'Step 6 - Validation Summary' }, // NOW STEP 6
    ];

const adjustedStep = fromRoute !== 'rule-configurations' && currentStep >= 4 ? currentStep - 3 : currentStep;
const totalSteps = displaySteps.length;
const progress = (adjustedStep / totalSteps) * 100;

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
            Please ensure your file has a valid sheet with headers.
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
            {fromRoute === 'rule-configurations'
              ? `Rule Configuration - Step ${currentStep}`
              : currentStep <= 3 
              ? `Rule Configuration - Step ${currentStep}`
              : `Data Validation - Step ${currentStep - 3}`}
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
              {displaySteps.map((s) => (
                <span
                  key={s.step}
                  className={`font-medium ${s.step === adjustedStep ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          
          {fromRoute === 'rule-configurations' ? (
            <>
              {/* Rule Configuration Steps 1-3 */}
              {currentStep === 1 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 1: Select Column Headers</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select Column Headers to configure Rules for Error Correction from file "{fileName}":
                  </p>
                  {headers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Select</TableHead>
                          <TableHead>Header</TableHead>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={headers.length > 0 && selectedHeaders.length === headers.length}
                                ref={el => {
                                  if (el) el.indeterminate = selectedHeaders.length > 0 && selectedHeaders.length < headers.length;
                                }}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedHeaders([...headers]);
                                  } else {
                                    setSelectedHeaders([]);
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                id="select-all-checkbox"
                              />
                              <label htmlFor="select-all-checkbox" className="text-sm text-gray-700" style={{ marginLeft: '4px', marginBottom: 0 }}>All</label>
                            </span>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headers.map((header, index) => (
                          <TableRow key={index} className="hover:bg-gray-100 transition-colors">
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
    <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 2: Configure Rules</h3>
    <p className="text-sm text-gray-600 mb-4">
      Drag and drop one data type rule from the left to apply it to each column header in file "{fileName}". Click the 'X' to delete a data type rule. The 'Required' rule is automatically applied and cannot be removed.
    </p>
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex space-x-6">
        <div className="w-1/4">
          <h5 className="text-sm font-semibold text-gray-600 mb-2">Generic Rules</h5>
          <Droppable droppableId="available-rules">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="bg-gray-100 p-4 rounded-lg min-h-[200px] max-h-[300px] overflow-y-auto"
              >
                {basicRules.map((rule, index) => (
                  <Draggable key={rule.rule_name} draggableId={rule.rule_name} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white p-2 mb-2 rounded shadow-sm border border-gray-200 cursor-move text-center"
                      >
                        {rule.rule_name.startsWith('Date(') ? 'Date' : rule.rule_name}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          
          {/* Only Template Custom Rules - Remove side-by-side layout */}
          <div className="mt-4">
            <h5 className="text-sm font-semibold text-gray-600 mb-2">Template Custom Rules</h5>
            <Droppable droppableId="template-custom-rules">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="bg-gray-100 p-4 rounded-lg min-h-[200px] max-h-[300px] overflow-y-auto"
                >
                  {customRules.map((rule, index) => (
                    <Draggable key={rule.rule_name} draggableId={rule.rule_name} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-2 mb-2 rounded shadow-sm border border-gray-200 flex items-center"
                        >
<input
  type="checkbox"
  checked={checkedCustomRules[rule.rule_id] || false}
  onChange={async (e) => {
    // NEW: Update state immediately for instant UI feedback
    const isChecked = e.target.checked;
    
    // Update checkbox state immediately
    setCheckedCustomRules((prev) => ({
      ...prev,
      [rule.rule_id]: isChecked,
    }));
    
    // Update custom rules state immediately
    setCustomRules((prev) =>
      prev.map((r) =>
        r.rule_id === rule.rule_id ? { ...r, is_active: isChecked } : r
      )
    );
    
    try {
      // Then call the API
      await apiService.toggleRuleActive(rule.rule_id, isChecked);
      
      toast({
        title: 'Success',
        description: `Rule ${rule.rule_name} ${isChecked ? 'activated' : 'deactivated'}.`,
        variant: 'default',
      });
    } catch (error: any) {
      // If API call fails, revert the state changes
      setCheckedCustomRules((prev) => ({
        ...prev,
        [rule.rule_id]: !isChecked, // Revert
      }));
      
      setCustomRules((prev) =>
        prev.map((r) =>
          r.rule_id === rule.rule_id ? { ...r, is_active: !isChecked } : r // Revert
        )
      );
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle rule active status.',
        variant: 'destructive',
      });
    }
  }}
  className="h-4 w-4 mr-2 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
/>
                <span>{rule.rule_name}</span>
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</div>

          <h5 className="text-sm font-semibold text-gray-600 mb-2 mt-4">Transformation Rules</h5>
          <Droppable droppableId="transformation-rules">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="bg-gray-100 p-4 rounded-lg min-h-[100px] max-h-[200px] overflow-y-auto"
              >
                <Draggable key="Transform-Date" draggableId="Transform-Date" index={0}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="bg-white p-2 mb-2 rounded shadow-sm border border-gray-200 cursor-move text-center"
                    >
                      Transform-Date
                    </div>
                  )}
                </Draggable>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => navigate(`/rules-management?from=rule-configurations&step=2&templateId=${templateId}`)}
          >
            + Add New Custom Rule
          </Button>
        </div>
        
        {/* Apply Rules to Headers with 6 columns per row */}
        <div className="w-3/4">
          <h5 className="text-sm font-semibold text-gray-600 mb-2">Apply Rules to Headers</h5>
          
          {/* Render tables in rows of 6 columns each */}
          {(() => {
            const columnsPerRow = 6;
            const headerChunks = [];
            for (let i = 0; i < selectedHeaders.length; i += columnsPerRow) {
              headerChunks.push(selectedHeaders.slice(i, i + columnsPerRow));
            }
            
            return headerChunks.map((chunk, chunkIndex) => (
              <Table key={chunkIndex} className={chunkIndex > 0 ? "mt-4" : ""}>
                <TableHeader>
                  <TableRow>
                    {chunk.map((header, index) => (
                      <TableHead key={index} className="text-center">{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {chunk.map((header, index) => (
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
                              {(validations[header] || []).filter((r) => r !== 'Required').map((rule, ruleIndex) => (
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
            ));
          })()}
  
          {/* NEW: Activated Template Custom Rules section - moved here with extra spacing */}
          {customRules.some(rule => checkedCustomRules[rule.rule_id]) && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <h5 className="text-sm font-semibold text-green-800 mb-3">Activated Template Custom Rules</h5>
              <div className="space-y-2">
                {customRules
                  .filter(rule => checkedCustomRules[rule.rule_id])
                  .map((rule) => (
                    <div
                      key={rule.rule_id}
                      className="bg-green-100 p-3 rounded shadow-sm border border-green-300"
                    >
                      <div className="font-medium text-green-800">{rule.rule_name}</div>
                      <div className="text-sm text-green-600 font-mono">{rule.parameters}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DragDropContext>
    <Dialog open={dateFormatDialog.open} onOpenChange={(open) => setDateFormatDialog({ ...dateFormatDialog, open, format: '' })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select {dateFormatDialog.rule === 'Date' ? 'Source' : 'Target'} Date Format for "{dateFormatDialog.header}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Date Format</Label>
          <select
            value={dateFormatDialog.format || ''}
            onChange={(e) => setDateFormatDialog({ ...dateFormatDialog, format: e.target.value })}
            className="border rounded p-2 w-full"
          >
            <option value="">Select Format</option>
            {['MM-DD-YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MM-YYYY', 'MM-YY', 'MM/YYYY', 'MM/YY'].map((fmt) => (
              <option key={fmt} value={fmt}>{fmt}</option>
            ))}
          </select>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            onClick={async () => {
              const format = dateFormatDialog.format;
              if (!format) {
                toast({ title: 'Error', description: 'Please select a date format.', variant: 'destructive' });
                return;
              }
              const formatMap = {
                'MM-DD-YYYY': '%m-%d-%Y', 'DD-MM-YYYY': '%d-%m-%Y', 'MM/DD/YYYY': '%m/%d/%Y', 'DD/MM/YYYY': '%d/%m/%Y',
                'MM-YYYY': '%m-%Y', 'MM-YY': '%m-%y', 'MM/YYYY': '%m/%Y', 'MM/YY': '%m/%y'
              };
              try {
                if (dateFormatDialog.rule === 'Date') {
                  const ruleName = `Date(${format})`;
                  await apiService.createRule({
                    rule_name: ruleName,
                    description: `Validates date format ${format} for column ${dateFormatDialog.header}`,
                    parameters: JSON.stringify({ format: formatMap[format] }),
                    column_name: dateFormatDialog.header,
                    template_id: Number(templateId),
                    source_format: format
                  });
                  handleValidationChange(dateFormatDialog.header, ruleName, true);
                  setSourceFormats((prev) => ({ ...prev, [dateFormatDialog.header]: format }));
                } else {
                  const ruleName = `Transform-Date(${format})`;
                  await apiService.createRule({
                    rule_name: ruleName,
                    description: `Transforms dates to ${format} for column ${dateFormatDialog.header}`,
                    parameters: JSON.stringify({ format: formatMap[format] }),
                    column_name: dateFormatDialog.header,
                    template_id: Number(templateId),
                    target_format: format
                  });
                  handleValidationChange(dateFormatDialog.header, ruleName, true);
                  setTargetFormats((prev) => ({ ...prev, [dateFormatDialog.header]: format }));
                }
                setDateFormatDialog({ open: false, header: '', rule: '', format: '' });
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.message || 'Failed to create rule.',
                  variant: 'destructive',
                });
              }
            }}
            disabled={!dateFormatDialog.format}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 3: Review Configured Rules</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Review the rule Configurations applied to the selected headers for file "{fileName}":
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Header</TableHead>
                        {validationOptions.map((rule) => (
                          <TableHead key={rule}>{rule}</TableHead>
                        ))}
                        <TableHead>Source Format</TableHead>
                        <TableHead>Target Format</TableHead>
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
                                checked={
                                  rule === 'Date'
                                    ? validations[header]?.some((r) => r.startsWith('Date('))
                                    : validations[header]?.includes(rule) || false
                                }
                                disabled={true}
                                className="h-4 w-4 text-black focus:ring-black border-black rounded"
                              />
                            </TableCell>
                          ))}
                          <TableCell>{sourceFormats[header] || '-'}</TableCell>
                          <TableCell>{targetFormats[header] || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {customRules.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4 text-gray-700">Custom Rules Applied</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Formula</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customRules.map((rule) => (
                            <TableRow key={rule.rule_id}>
                              <TableCell className="text-gray-800">{rule.rule_name}</TableCell>
                              <TableCell>{rule.parameters || 'No formula defined'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-4">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      onClick={() => {
                        setCurrentStep(2);
                        setIsReviewMode(false);
                        navigate(`/validate/${templateId}?step=2${fromRoute ? `&from=${fromRoute}` : ''}`);
                      }}
                      disabled={loading}
                    >
                      Edit
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      onClick={() => handleStepSubmit(2, { validations }, 'save')}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Finish'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Auto Data Validation Steps 1-3 (if currentStep <= 3) */}
              {currentStep === 1 && fromRoute === 'auto-data-validation' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 1: Select Column Headers</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select Column Headers to configure Rules for Error Correction from file "{fileName}":
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
                          <TableRow key={index} className="hover:bg-gray-100 transition-colors">
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

              {currentStep === 2 && fromRoute === 'auto-data-validation' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 2: Configure Rules</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop one data type rule from the left to apply it to each column header in file "{fileName}". Click the 'X' to delete a data type rule. The 'Required' rule is automatically applied and cannot be removed.
                  </p>
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex space-x-6">
                      <div className="w-1/4">
                        <h5 className="text-sm font-semibold text-gray-600 mb-2">Generic Rules</h5>
                        <Droppable droppableId="available-rules">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="bg-gray-100 p-4 rounded-lg min-h-[200px] max-h-[300px] overflow-y-auto"
                            >
                              {basicRules.map((rule, index) => (
                                <Draggable key={rule.rule_name} draggableId={rule.rule_name} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="bg-white p-2 mb-2 rounded shadow-sm border border-gray-200 cursor-move text-center"
                                    >
                                      {rule.rule_name}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  </DragDropContext>
                  <div className="mt-4 flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(1);
                        navigate(`/validate/${templateId}?step=1${fromRoute ? `&from=${fromRoute}` : ''}`);
                      }}
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleStepSubmit(2, { validations }, 'review')}
                    >
                      Save and Review
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && fromRoute === 'auto-data-validation' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 3: Review Configured Rules</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Review the rule Configurations applied to the selected headers for file "{fileName}":
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
                          <TableCell>{header}</TableCell>
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
                  <Dialog open={frequencyDialogOpen} onOpenChange={setFrequencyDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Validation Frequency</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Label>Validation Frequency</Label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value as 'WEEKLY' | 'MONTHLY' | 'YEARLY')}
                          className="border rounded p-2 w-full"
                        >
                          <option value="">Select Frequency</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                          onClick={async () => {
                            if (frequency) {
                              await apiService.setValidationFrequency(Number(templateId), { validation_frequency: frequency });
                              setFrequencyDialogOpen(false);
                              handleStepSubmit(2, { validations }, 'save');
                            } else {
                              toast({
                                title: 'Error',
                                description: 'Please select a frequency.',
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={!frequency}
                        >
                          Save and Finish
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="mt-4 flex space-x-4">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setCurrentStep(2);
                        navigate(`/validate/${templateId}?step=2${fromRoute ? `&from=${fromRoute}` : ''}`);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setFrequencyDialogOpen(true)}
                    >
                      Finish
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Validation Steps 4-8 */}
              {currentStep === 4 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 1 - Generic Error Detection</h3>
                  <p className="text-sm text-gray-600 mb-4">Detected errors in "{fileName}":</p>
                  
                  {fetchingErrors ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Detecting errors...</p>
                    </div>
                  ) : Object.keys(genericErrorReasons).length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            {headers.map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {genericDataRows.map((row, rowIndex) => {
                            const rowKey = rowIndex.toString();
                            const hasError = rowKey in genericErrorReasons;
                            if (!hasError) return null;
                            
                            return (
                              <TableRow key={rowIndex}>
                                <TableCell>{rowIndex + 1}</TableCell>
                                {headers.map((header, colIndex) => {
                                  const error = genericErrorLocations[header]?.find((err: ErrorLocation) => err.row === rowIndex + 1);
                                  const cellHasError = !!error;
                                  const displayValue = row[header] || 'NULL';
                                  const cellClass = cellHasError ? 'bg-red-100 text-red-600' : '';
                                  
                                  return (
                                    <TableCell key={colIndex} className={cellClass}>
                                      {displayValue}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-red-600">{genericErrorReasons[rowKey]}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-green-600">No generic errors found.</p>
                  )}
                  
                  <div className="mt-4 flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate(fromRoute === 'rule-configurations' ? '/rule-configurations' : '/dashboard')}
                    >
                      <Home className="h-5 w-5 mr-2" />
                      {fromRoute === 'rule-configurations' ? 'Rule Configurations' : 'Home'}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={Object.keys(genericErrorReasons).length === 0 || fetchingErrors || !hasFetchedCorrectionData}
                    >
                      Automatic Correction
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setCurrentStep(5);
                        navigate(`/validate/${templateId}?step=5${fromRoute ? `&from=${fromRoute}` : ''}`);
                      }}
                      disabled={Object.keys(genericErrorReasons).length === 0 || fetchingErrors || !hasFetchedCorrectionData}
                    >
                      Manual Correction
                    </Button>
                  </div>
                </div>
              )}


{currentStep === 5 && (
  <div>
    <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 2 - Generic Error Correction</h3>
    <p className="text-sm text-gray-600 mb-4">Correct the generic errors in "{fileName}":</p>
    
    {/* Show validation error summary if there are errors */}
    {hasValidationErrors && (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <h4 className="text-sm font-semibold text-red-800">Invalid Data Detected</h4>
        </div>
        <p className="text-sm text-red-700 mt-1">
          Please correct the highlighted fields before proceeding to the next step.
        </p>
      </div>
    )}
    
    {genericDataRows.length > 0 ? (
      <div className="max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              {headers.map((header, index) => (
                <TableHead key={index}>{header}</TableHead>
              ))}
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {genericDataRows.map((row, rowIndex) => {
              const rowKey = rowIndex.toString();
              const hasError = rowKey in genericErrorReasons;
              if (!hasError) return null;
              
              return (
                <TableRow key={rowIndex}>
                  <TableCell>{rowIndex + 1}</TableCell>
                  {headers.map((header, colIndex) => {
                    const error = genericErrorLocations[header]?.find((err: ErrorLocation) => err.row === rowIndex + 1);
                    const cellHasError = !!error;
                    const displayValue = row[header] || 'NULL';
                    const correctedValue = genericCorrections[header]?.[rowIndex.toString()] || displayValue;
                    const isValid = correctionValidity[header]?.[rowIndex.toString()] !== false;
                    const hasValidationError = correctionValidationErrors[header]?.[rowIndex.toString()];
                    
                    let cellClass = '';
                    if (cellHasError) {
                      if (hasValidationError) {
                        cellClass = 'bg-red-100 text-red-600 border-red-300';
                      } else if (isValid && correctedValue !== displayValue) {
                        cellClass = 'bg-green-100 text-green-600';
                      } else {
                        cellClass = 'bg-red-100 text-red-600';
                      }
                    }
                    
                    return (
                      <TableCell key={colIndex} className={cellClass}>
                        {cellHasError ? (
                          <div className="relative">
                            <Input
                              type="text"
                              value={correctedValue === 'NULL' ? '' : correctedValue}
                              onChange={(e) => handleGenericCorrectionChangeWithToast(header, rowIndex, e.target.value)}
                              placeholder={displayValue === 'NULL' ? 'Enter value' : undefined}
                              className={`border rounded p-2 focus:ring-blue-500 focus:border-blue-500 w-full ${
                                hasValidationError 
                                  ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500' 
                                  : 'border-gray-300'
                              }`}
                            />
                            {hasValidationError && (
                              <div className="absolute -bottom-6 left-0 text-xs text-red-600 font-medium">
                                {hasValidationError}
                              </div>
                            )}
                          </div>
                        ) : (
                          displayValue
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-red-600">{genericErrorReasons[rowKey]}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    ) : (
      <p className="text-green-600">No generic errors to correct.</p>
    )}
    
    <div className="mt-6 flex space-x-4">
      <Button
        variant="outline"
        onClick={() => {
          setCurrentStep(4);
          navigate(`/validate/${templateId}?step=4${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => {
        }}
        >
          Upload Corrected File
        </Button>
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={async () => {
          if (hasValidationErrors) {
            toast({
              title: 'Data Validation Failed',
              description: 'Please correct all invalid data before continuing.',
              variant: 'destructive',
            });
            return;
          }
          
          try {
            const response = await apiService.saveExistingTemplateCorrections(Number(templateId), genericCorrections, 'generic');
            setGenericCorrectedFilePath(response.data.corrected_file_path);
            const filename = response.data.corrected_file_path.split('/').pop() || '';
            const blob = await apiService.downloadFile(filename);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to download corrected file.', variant: 'destructive' });
          }
        }}
        disabled={hasValidationErrors}
      >
        Download Corrected File
      </Button>
      <Button
        className={`transition-colors ${hasValidationErrors ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        onClick={async () => {
          if (hasValidationErrors) {
            toast({
              title: 'Data Validation Failed',
              description: 'Please correct all invalid data before continuing.',
              variant: 'destructive',
            });
            return;
          }
          
          try {
            await apiService.saveExistingTemplateCorrections(Number(templateId), genericCorrections, 'generic');
            setGenericErrorsCorrected(Object.values(genericCorrections).reduce((acc, obj) => acc + Object.keys(obj).length, 0));
            setCurrentStep(6);
            navigate(`/validate/${templateId}?step=6${fromRoute ? `&from=${fromRoute}` : ''}`);
          } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to save generic corrections.', variant: 'destructive' });
          }
        }}
        disabled={hasValidationErrors}
      >
        Next
      </Button>
    </div>
  </div>
)}

              {currentStep === 6 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 3 - Custom Error Detection & Correction</h3>
                  <p className="text-sm text-gray-600 mb-4">Correct the custom errors in "{fileName}":</p>
                  
                  {localDataRows.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            {headers.map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {localDataRows.map((row, rowIndex) => {
                            const rowKey = rowIndex.toString();
                            const hasError = rowKey in customErrorReasons;
                            const isResolved = rowValidity[rowKey] === true;
                            
                            if (!hasError && !isResolved && !Object.values(customErrorLocations).some(errors => 
                              errors.some(err => err.row === rowIndex + 1))) {
                              return null;
                            }
                            
                            return (
                              <TableRow key={rowIndex} className={isResolved ? 'bg-green-50' : ''}>
                                <TableCell>{rowIndex + 1}</TableCell>
                                {headers.map((header, colIndex) => {
                                  const cellError = customErrorLocations[header]?.find((err: any) => err.row === rowIndex + 1);
                                  const cellHasError = cellError && !cellError.resolved;
                                  const cellIsResolved = cellError && cellError.resolved;
                                  
                                  const isInvolvedInFormula = customRules.some(rule => {
                                    const formula = rule.parameters || '';
                                    return formula.includes(`'${header}'`) || rule.column_name === header;
                                  });
                                  
                                  const displayValue = localDataRows[rowIndex][header] || 'NULL';
                                  
                                  let cellClass = '';
                                  if (cellIsResolved) {
                                    cellClass = 'bg-green-100 text-green-600';
                                  } else if (cellHasError) {
                                    cellClass = 'bg-red-100 text-red-600';
                                  }
                                  
                                  return (
                                    <TableCell key={colIndex} className={cellClass}>
                                      {(cellHasError || isInvolvedInFormula) ? (
                                        <Input
                                          type="text"
                                          value={displayValue === 'NULL' ? '' : displayValue}
                                          onChange={(e) => handleCustomCorrectionChange(header, rowIndex, e.target.value)}
                                          placeholder={displayValue === 'NULL' ? 'Enter value' : undefined}
                                          className={`border rounded p-2 focus:ring-blue-500 focus:border-blue-500 w-full ${
                                            cellIsResolved ? 'border-green-400 bg-green-50' : 
                                            cellHasError ? 'border-red-400 bg-red-50' : ''
                                          }`}
                                          disabled={validatingRow}
                                        />
                                      ) : (
                                        <span className={cellIsResolved ? 'text-green-600' : ''}>{displayValue}</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className={isResolved ? 'text-green-600' : 'text-red-600'}>
                                  {isResolved ? 'Formula satisfied' : (customErrorReasons[rowKey] || '')}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-green-600">No custom errors to correct.</p>
                  )}
                  
                  {validatingRow && (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                      <span className="text-blue-600">Validating...</span>
                    </div>
                  )}
                  
                  <div className="mt-4 flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(5);
                        navigate(`/validate/${templateId}?step=5${fromRoute ? `&from=${fromRoute}` : ''}`);
                      }}
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                      }}
                      >
                        Upload Corrected File
                      </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={async () => {
                        try {
                          const allCorrections = {
                            ...genericCorrections,
                            ...customCorrections
                          };
                          
                          const response = await apiService.saveExistingTemplateCorrections(
                            Number(templateId), 
                            allCorrections, 
                            'final'
                          );
                          
                          setFinalCorrectedFilePath(response.data.corrected_file_path);
                          
                          const filename = response.data.corrected_file_path.split('/').pop() || '';
                          const blob = await apiService.downloadFile(filename);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          a.click();
                          URL.revokeObjectURL(url);
                          
                          toast({ 
                            title: 'Success', 
                            description: 'Final corrected file downloaded with all corrections applied.', 
                            variant: 'default' 
                          });
                        } catch (error: any) {
                          console.error('Download error:', error);
                          toast({ 
                            title: 'Error', 
                            description: 'Failed to download final corrected file.', 
                            variant: 'destructive' 
                          });
                        }
                      }}
                      disabled={validatingRow}
                    >
                      Download Final Corrected File
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={async () => {
                        try {
                          const allCorrections = {
                            ...genericCorrections,
                            ...customCorrections
                          };
                          
                          const response = await apiService.saveExistingTemplateCorrections(
                            Number(templateId), 
                            allCorrections, 
                            'final'
                          );
                          
                          setFinalCorrectedFilePath(response.data.corrected_file_path);
                          
                          const remainingErrors = Object.keys(customErrorReasons).length;
                          const totalCustomErrors = Object.values(customErrorLocations).reduce((sum, arr) => sum + arr.length, 0);
                          const correctedCustomErrors = totalCustomErrors - remainingErrors;
                          
                          setCustomErrorsCorrected(correctedCustomErrors);
                          
                          if (remainingErrors > 0) {
                            toast({ 
                              title: 'Warning', 
                              description: `${remainingErrors} custom errors remain uncorrected.`, 
                              variant: 'default' 
                            });
                          }
                          
                          setCurrentStep(7);
                          navigate(`/validate/${templateId}?step=7${fromRoute ? `&from=${fromRoute}` : ''}`);
                        } catch (error: any) {
                          console.error('Save error:', error);
                          toast({ 
                            title: 'Error', 
                            description: 'Failed to save final corrections.', 
                            variant: 'destructive' 
                          });
                        }
                      }}
                      disabled={validatingRow}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

{currentStep === 7 && (
  <div>
    <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 4 - Master Data Errors</h3>
    <p className="text-sm text-gray-600 mb-4">Validation results for "{fileName}":</p>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="text-green-600">No errors detected</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div className="mt-4 flex space-x-4">
      <Button
        variant="outline"
        onClick={() => {
          setCurrentStep(6);
          navigate(`/validate/${templateId}?step=6${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      
      {/* UPDATE THIS BUTTON TO GO TO STEP 8 (Transformation Rules) */}
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => {
          // Dummy button - no action
        }}
        disabled
      >
        Download Corrected File
      </Button>
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => {
          setCurrentStep(8);
          navigate(`/validate/${templateId}?step=8${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        Next
        </Button>
    </div>
  </div>
)}



{currentStep === 8 && (
  <div>
    <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 5 - Transformation Rules</h3>
    <p className="text-sm text-gray-600 mb-6">
      Review your file data below. Date columns will be transformed when you click "Transform".
    </p>
    
    {/* Show transformation rules info */}
    {Object.keys(targetFormats || {}).length > 0 && (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Transformation Rules:</h4>
        <div className="text-sm text-blue-700">
          {Object.entries(targetFormats || {}).map(([column, targetFormat]) => {
            // Find the actual source format for this column from sourceFormats
            const sourceFormat = sourceFormats[column] || '-';
            return (
              <span key={column} className="inline-block mr-4">
                <strong>{column}:</strong> {sourceFormat} to {targetFormat}
              </span>
            );
          })}
        </div>
      </div>
    )}
    
    {/* No transformation rules message */}
    {Object.keys(targetFormats || {}).length === 0 && (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">No Transformation Rules Found</h4>
        <p className="text-sm text-yellow-700">
          No date transformation rules are configured for this template. You need both Date rules (source format) and Transform-Date rules (target format) to apply transformations.
        </p>
      </div>
    )}
    
    {/* Loading State */}
    {transformationDataLoading && (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading file data...</p>
      </div>
    )}
    
    {/* File Data Display */}
    {!transformationDataLoading && transformationDataRows.length > 0 && (
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3 text-gray-700">
          File Data {transformationApplied ? '(After Transformation)' : '(Before Transformation)'}
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          {transformationApplied 
            ? 'Date columns have been transformed to the target format.'
            : `Showing ${Math.min(transformationDataRows.length, 100)} of ${transformationDataRows.length} rows. Date columns highlighted in blue will be transformed.`
          }
        </p>
        
        <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50">
              <TableRow>
                <TableHead className="w-16 text-center">Row</TableHead>
                {headers?.map((header, index) => {
                  const isTransformColumn = Object.keys(targetFormats || {}).includes(header);
                  return (
                    <TableHead 
                      key={index} 
                      className={`text-center ${isTransformColumn ? 'bg-blue-100 text-blue-800 font-semibold' : ''}`}
                    >
                      {header}
                      {isTransformColumn && (
                        <div className="text-xs text-blue-600 mt-1">
                          {transformationApplied ? ' Transformed' : 'Will Transform'}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformationDataRows.slice(0, 100).map((row, rowIndex) => (
                <TableRow key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}>
                  <TableCell className="font-medium text-center">{rowIndex + 1}</TableCell>
                  {headers?.map((header, colIndex) => {
                    const isTransformColumn = Object.keys(targetFormats || {}).includes(header);
                    const cellValue = row[header] || '';
                    const displayValue = cellValue === 'NULL' ? '' : String(cellValue);
                    
                    let cellClass = 'text-center';
                    if (isTransformColumn) {
                      if (transformationApplied) {
                        cellClass += ' bg-green-100 text-green-800 font-medium'; // Transformed
                      } else {
                        cellClass += ' bg-blue-100 text-blue-800 font-medium'; // Will be transformed
                      }
                    }
                    
                    return (
                      <TableCell key={colIndex} className={cellClass}>
                        {displayValue}
                        {isTransformColumn && transformationApplied && (
                          <span className="ml-1 text-xs text-green-600"></span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transformationDataRows.length > 100 && (
            <div className="p-3 text-center text-sm text-gray-600 bg-gray-50 border-t">
              Showing first 100 rows of {transformationDataRows.length} total rows
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {Object.keys(targetFormats || {}).length > 0 && !transformationApplied && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 mr-2"></div>
              <span>Date columns (will be transformed)</span>
            </div>
          )}
          {transformationApplied && Object.keys(targetFormats || {}).length > 0 && (
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 mr-2"></div>
              <span>Transformed date values </span>
            </div>
          )}
        </div>
      </div>
    )}

    {/* No data message */}
    {!transformationDataLoading && transformationDataRows.length === 0 && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">
          No file data available to display. Please ensure previous steps were completed correctly.
        </p>
      </div>
    )}

    {/* Transformation Status */}
    {transformationApplied && (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">
              Transformation complete! Date formats changed in {Object.keys(targetFormats || {}).length} columns and displayed in the table above.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Action Buttons */}
    <div className="mt-6 flex space-x-4">
      <Button
        variant="outline"
        onClick={() => {
          setCurrentStep(7);
          navigate(`/validate/${templateId}?step=7${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={handleApplyTransformation}
        disabled={transformationLoading || Object.keys(targetFormats || {}).length === 0}
      >
        {transformationLoading ? (
          <>
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Applying...
          </>
        ) : (
          <>
            <RefreshCw className="h-5 w-5 mr-2" />
            Transform
          </>
        )}
      </Button>

      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={handleDownloadTransformedFile}
        disabled={!transformationApplied}
      >
        <Download className="h-5 w-5 mr-2" />
        Download Transformed File
      </Button>

      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => {
          setCurrentStep(9);
          navigate(`/validate/${templateId}?step=9${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        Next
      </Button>
    </div>
  </div>
)}
              {currentStep === 9 && (
  <div>
    <h3 className="text-lg font-semibold mb-4 text-gray-700">Step 6 - Validation Summary</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>No of Generic Rules Applied</CardTitle>
        </CardHeader>
        <CardContent>{genericRulesApplied}</CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>No of Generic Errors Detected</CardTitle>
        </CardHeader>
        <CardContent>{genericErrorsDetected}</CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>No of Generic Errors Corrected</CardTitle>
        </CardHeader>
        <CardContent>{genericErrorsCorrected}</CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>No of Template Custom Rules Applied</CardTitle>
        </CardHeader>
        <CardContent>{customRulesApplied}</CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>No of Custom Errors Detected</CardTitle>
        </CardHeader>
        <CardContent>{customErrorsDetected}</CardContent>
      </Card>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>No of Custom Errors Corrected</CardTitle>
        </CardHeader>
        <CardContent>{customErrorsCorrected}</CardContent>
      </Card>
    </div>
    
    {genericErrorsCorrected + customErrorsCorrected === genericErrorsDetected + customErrorsDetected && (
      <p className="text-green-600 mt-4 text-center">All errors resolved.</p>
    )}
    
    <div className="mt-4 flex space-x-4 justify-center">
      <Button
        variant="outline"
        onClick={() => {
          setCurrentStep(8);
          navigate(`/validate/${templateId}?step=8${fromRoute ? `&from=${fromRoute}` : ''}`);
        }}
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={async () => {
          try {
            await handleValidateCorrected();
            localStorage.setItem('lastValidation', JSON.stringify({
              templateId,
              finalCorrectedFilePath,
              stats: {
                genericRulesApplied,
                genericErrorsDetected,
                genericErrorsCorrected,
                customRulesApplied,
                customErrorsDetected,
                customErrorsCorrected,
              },
            }));
            toast({ title: 'Success', description: 'Validation process completed.', variant: 'default' });
            if (fromRoute === 'auto-data-validation') {
              navigate('/sftp-dashboard', { state: { sftpCredentials } });
            } else {
              navigate('/dashboard');
            }
          } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to finish validation.', variant: 'destructive' });
          }
        }}
      >
        Finish
      </Button>
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
}
// Helper function for text validation
function has_special_characters_except_quotes_and_parenthesis(s: string): boolean {
  if (!s || typeof s !== 'string') return true;
  
  for (let char of s) {
    if (char !== '"' && char !== '(' && char !== ')' && !char.match(/[a-zA-Z\s]/)) {
      return true;
    }
  }
  return false;
}

export default Validate;