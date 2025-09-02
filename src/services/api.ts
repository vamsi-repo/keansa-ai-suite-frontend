import axios from 'axios';
 

const api = axios.create({
  baseURL: import.meta.env.PROD 
    ? import.meta.env.VITE_API_URL || '/api'
    : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Types for API responses and requests
interface User {
  email: string;
  id: number;
}
 
interface Template {
  template_id: number;
  template_name: string;
  created_at: string;
  status: string;
  is_corrected?: boolean;
}
 
interface ValidationHistoryEntry {
  history_id: number;
  template_id: number;
  template_name: string;
  error_count: number;
  corrected_at: string;
  corrected_file_path: string;
}
 
interface ValidationGroup {
  original_uploaded_at: string;
  data_loads: ValidationHistoryEntry[];
}
 
interface ValidationHistory {
  [template_name: string]: ValidationGroup;
}
 
interface Correction {
  row_index: number;
  column_name: string;
  original_value: string;
  corrected_value: string;
  row_data: Record<string, string>;
}
 
interface ErrorLocation {
  row: number;
  value: string;
  rule_failed: string;
  reason: string;
}
 
interface SFTPConnectionResponse {
  success: boolean;
  message: string;
  error?: string;
}
 
interface SFTPFetchResponse {
  success: boolean;
  sheets: { [key: string]: { headers: string[] } };
  file_name: string;
  template_id: number;
  has_existing_rules: boolean;
  sheet_name: string;
  skip_to_step_3: boolean;
  error?: string;
}
 
interface FileEntry {
  filename: string;
  template_id: number | null;
  status: 'Errors Detected' | 'File Not Configured';
  validation_frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  first_identified_at: string | null;
}
interface Rule {
  rule_type_id: number;
  rule_name: string;
  description: string;
  parameters: string;
  is_custom: boolean;
  is_active: boolean;
  column_name?: string;
  template_id?: number;
  source_format?: string;
  target_format?: string;
  data_type?: string;
}
// Update existing getRules endpoint
export const getRules = () =>
  api.get<{
    success: boolean;
    rules: Rule[];
  }>('/rules')
    .then((response) => {
      console.log('getRules response:', response.data);
      return response;
    })
    .catch((error) => {
      console.error('getRules error:', error.response?.data || error.message);
      throw error;
    });
 
export const toggleRuleActive = (rule_type_id: number, isActive: boolean) =>
  api.put<{ success: boolean; message: string }>(`/rules/${rule_type_id}/toggle-active`, { is_active: isActive })
    .then((response) => {
      console.log('toggleRuleActive response:', response.data);
      return response;
    })
    .catch((error) => {
      console.error('toggleRuleActive error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });

export const getTransformedData = (templateId: number) =>
  api.get<{
    success: boolean;
    data_rows: Record<string, any>[];
    headers: string[];
  }>(`/get-file-data-for-transformation/${templateId}`)
    .then((response) => {
      console.log('getTransformedData response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get file data');
      }
      return response;
    })
    .catch((error) => {
      console.error('getTransformedData error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });



export const debugTransformationRules = (templateId: number) =>
  api.get<{
    success: boolean;
    template_id: number;
    total_rules: number;
    rules: any[];
  }>(`/debug-transformation-rules/${templateId}`)
    .then((response) => {
      console.log('debugTransformationRules response:', response.data);
      return response;
    })
    .catch((error) => {
      console.error('debugTransformationRules error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });

export const applyTransformationRules = (templateId: number) =>
  api.post<{ 
    success: boolean; 
    message: string;
    transformed_file_path?: string;
  }>(`/apply-transformation/${templateId}`, {}, {
    headers: { 'Content-Type': 'application/json' }
  })
    .then((response) => {
      console.log('applyTransformationRules response:', response.data);
      return response;
    })
    .catch((error) => {
      console.error('applyTransformationRules error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });

export const downloadTransformedFile = (templateId: number) => {
  console.log('Initiating transformed file download for templateId:', templateId);
  window.location.href = `/api/download-transformed/${templateId}`;
};

export const validateColumnRules = (templateId: number) =>
  api.get<{ success: boolean; errors: Record<string, { row: number; value: string; reason: string }[]> }>(
    `/validate-column-rules/${templateId}`
  )
    .then((response) => {
      console.log('validateColumnRules response:', response.data);
      return response;
    })
    .catch((error) => {
      console.error('validateColumnRules error:', error.response?.data || error.message);
      throw error;
    });
 
// Add createRule endpoint
export const createRule = (data: {
  rule_name: string;
  description: string;
  parameters: string;
  column_name: string;
  template_id: number;
  source_format?: string;
  target_format?: string;
}) =>
  api.post<{ success: boolean; message: string }>('/rules', {
    rule_name: data.rule_name,
    description: data.description || '',
    parameters: data.parameters,
    column_name: data.column_name,
    template_id: data.template_id,
    source_format: data.source_format,
    target_format: data.target_format
  })
    .then((response) => {
      console.log('createRule response:', response.data, 'with parameters:', data.parameters);
      return response;
    })
    .catch((error) => {
      console.error('createRule error:', error.response?.data || error.message, 'with parameters:', data.parameters);
      throw error.response?.data || error;
    });

export const updateRule = (
  ruleId: number,
  data: {
    rule_name: string;
    description: string;
    parameters: string;
    column_name: string;
    template_id: number;
  }
) =>
  api.put<{ success: boolean; message: string }>(`/rules/${ruleId}`, {
    rule_name: data.rule_name,
    description: data.description || '',
    parameters: data.parameters,
    column_name: data.column_name,
    template_id: data.template_id,
  })
    .then((response) => {
      console.log('updateRule response:', response.data, 'with parameters:', data.parameters);
      return response;
    })
    .catch((error) => {
      console.error('updateRule error:', error.response?.data || error.message, 'with parameters:', data.parameters);
      throw error.response?.data || error;
    });
// Authentication endpoints
export const checkAuthStatus = () =>
  api.get<{ success: boolean; user?: User; message?: string }>('/check-auth');
 
export const login = (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  return api.post<{ success: boolean; message: string; user?: User }>('/authenticate', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

export const validateCorrectedTemplate = (templateId: number) =>
  api.post<{
    success: boolean;
    message: string;
    results: { rule_name: string; column_name: string; errors: { row: number; value: string; rule_failed: string; reason: string }[] }[];
  }>(
    `/validate-corrected/${templateId}`,
    {},
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response) => {
      console.log('validateCorrectedTemplate response:', response.data);
      if (!response.data.success) {
        console.error('Validation failed:', response.data.message);
        throw new Error(response.data.message || 'Failed to validate corrected template');
      }
      return response;
    })
    .catch((error) => {
      console.error('validateCorrectedTemplate error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error.response?.data || error;
    });

export const downloadValidationReport = (templateId: number) => {
  console.log('Initiating validation report download for templateId:', templateId);
  window.location.href = `/api/download-validation-report/${templateId}`;
};
 
export const register = (userData: {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  password: string;
  confirm_password: string;
}) => {
  const params = new URLSearchParams();
  Object.entries(userData).forEach(([key, value]) => {
    params.append(key, value);
  });
  return api.post<{ success: boolean; message: string; user?: User }>('/register', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};
 
export const resetPassword = (data: {
  email: string;
  new_password: string;
  confirm_password: string;
}) =>
  api.post<{ success: boolean; message: string }>('/reset_password');
 
export const logout = () =>
  api.post<{ success: boolean; message: string }>('/logout');
 
// Template endpoints
export const getTemplates = () =>
  api.get<{ success: boolean; templates: Template[] }>('/templates')
    .then((response) => {
      console.log('getTemplates response:', response.data);
      if (!response.data.success || !Array.isArray(response.data.templates)) {
        throw new Error('Invalid templates response: Missing or invalid templates data.');
      }
      return response;
    })
    .catch((error) => {
      console.error('getTemplates error:', {
        message: error.message,
        response: error.response?.data,
      });
      throw error.response?.data || error;
    });
 
export const getTemplate = (templateId: number, sheetName: string) =>
  api.get<{
    sheets: { [key: string]: { headers: string[] } };
    file_name: string;
    file_path: string;
    sheet_name: string;
    has_existing_rules?: boolean;
  }>(`/template/${templateId}/${sheetName}`);
 
export const getSelectedHeadersForTemplate = (templateId: number) =>
  api.get<{ headers: string[] }>(`/template/${templateId}/headers`);
 
export const updateTemplate = (templateId: number, updatedData: any) =>
  api.post<{ success: boolean; file_path: string }>(`/update_template/${templateId}`, { updated_data: updatedData });
 
export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{
    success: boolean;
    sheets: { [key: string]: { headers: string[] } };
    file_name: string;
    template_id: number;
    has_existing_rules: boolean;
    sheet_name: string;
    skip_to_step_3: boolean;
    error?: string;
  }>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then((response) => {
    console.log('uploadFile response:', response.data);
    return response;
  }).catch((error) => {
    console.error('uploadFile error:', error.response?.data || error.message);
    throw error.response?.data || error;
  });
};
 
// api.ts
export const downloadFile = (filename: string) => {
  console.log('Initiating download for filename:', filename);
  const encodedFilename = encodeURIComponent(filename);
  return api.get(`/download/${encodedFilename}`, {
    responseType: 'blob', // Ensure response is treated as a binary blob
  }).then((response) => {
    console.log('Download response received:', {
      status: response.status,
      headers: response.headers,
      type: response.data.type
    });
    return response.data; // Return the blob data
  }).catch((error) => {
    console.error('downloadFile error:', error.response?.data || error.message);
    throw error.response?.data || error;
  });
};
 
// Validation steps for new templates
export const getStepData = (step: number) =>
  api.get<{
    headers?: string[];
    selected_headers?: string[];
  }>(`/step/${step}`);
 
interface StepOneResponse {
  success: boolean;
  headers?: string[];
  validations?: Record<string, string[]>;
}
 
interface StepTwoResponse {
  success: boolean;
  message: string;
}
export const listSftpOutboundFiles = (sftpData: {
  hostname: string;
  username: string;
  password: string;
  port?: number;
  folder_path: string;
}) => {
  const formData = new FormData();
  formData.append('hostname', sftpData.hostname.trim());
  formData.append('username', sftpData.username.trim());
  formData.append('password', sftpData.password);
  formData.append('port', sftpData.port?.toString() || '22');
  formData.append('folder_path', sftpData.folder_path.trim());
 
 
  return api.post<{ success: boolean; files: { filename: string; timestamp: string }[] }>(
    '/sftp-list-outbound-files',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};
interface ValidatedFile {
  filename: string;
  timestamp: string;
}
 
const fetchOutboundFiles = async (sftpData: {
  hostname: string;
  username: string;
  password: string;
  port?: number;
  folder_path: string;
}): Promise<ValidatedFile[]> => {
  try {
    const response = await listSftpOutboundFiles({
      hostname: sftpData.hostname,
      username: sftpData.username,
      password: sftpData.password,
      port: parseInt(sftpData.port as any) || 22,
      folder_path: sftpData.folder_path,
    });
    if (response.data.success) {
      return response.data.files;
    } else {
      throw new Error('Failed to list validated files.');
    }
  } catch (error: any) {
    console.error('Error fetching outbound files:', error);
    throw new Error('Failed to fetch validated files from Outbound folder.');
  }
};
 
export const submitStepOne = (data: { headers: string[]; new_header_row?: string }) => {
  const formData = new FormData();
  data.headers.forEach((header) => formData.append('headers', header));
  if (data.new_header_row) formData.append('new_header_row', data.new_header_row);
  console.log('Step 1 FormData:', Array.from(formData.entries()));
  return api.post<StepOneResponse>('/step/1', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
 
export const submitStepTwo = (data: { validations: Record<string, string[]>; action: string }) => {
  const formData = new FormData();
  if (data.validations) {
    Object.entries(data.validations).forEach(([header, rules]) => {
      if (Array.isArray(rules)) {
        rules.forEach((rule) => formData.append(`validations_${header}`, rule));
      }
    });
  }
  formData.append('action', data.action);
  console.log('Step 2 FormData:', Array.from(formData.entries()));
  return api.post<StepTwoResponse>('/step/2', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
 
// Validation for existing templates
export const validateExistingTemplate = (templateId: number) =>
  api.get<{
    success: boolean;
    error_cell_locations: Record<string, ErrorLocation[]>;
    data_rows: Record<string, any>[];
  }>(`/validate-existing/${templateId}`)
    .then((response) => {
      console.log('validateExistingTemplate response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to validate template');
      }
      return response;
    })
    .catch((error) => {
      console.error('validateExistingTemplate error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });
 
export const saveExistingTemplateCorrections = (
  templateId: number, 
  corrections: Record<string, Record<string, string>>, 
  phase?: 'generic' | 'custom' | 'final'
) =>
  api.post<{ 
    success: boolean; 
    corrected_file_path: string; 
    history_id: number;
    correction_count: number;
    message: string;
  }>(
    `/validate-existing/${templateId}`, 
    { corrections, phase }, 
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
    .then((response) => {
      console.log('saveExistingTemplateCorrections response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save corrections');
      }
      return response;
    })
    .catch((error) => {
      console.error('saveExistingTemplateCorrections error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });
    
// Rule configuration and validation history endpoints
export const getRuleConfigurations = () =>
  api.get<{
    success: boolean;
    templates: { template_id: number; template_name: string; created_at: string; rule_count: number }[];
  }>('/rule-configurations');
 
  export const getConfigurationHistory = () =>
  api.get<{
    success: boolean;
    templates: { template_id: number; template_name: string; created_at: string; rule_count: number }[];
  }>('/rule-configurations')
    .then((response) => {
      console.log('getConfigurationHistory response:', response.data);
      if (!response.data.success || !Array.isArray(response.data.templates)) {
        throw new Error('Invalid configuration history response');
      }
      return response;
    })
    .catch((error) => {
      console.error('getConfigurationHistory error:', error.response?.data || error.message);
      throw error;
    });

export const getValidationHistory = () =>
  api.get<{ success: boolean; history: ValidationHistory }>('/validation-history')
    .then((response) => {
      if (!response.data.success) {
        throw new Error((response as any).message || 'Failed to fetch validation history');
      }
      // Ensure history is an object
      const history = response.data.history || {};
      if (typeof history !== 'object' || history === null) {
        throw new Error('Invalid validation history format');
      }
      return response;
    })
    .catch((error) => {
      console.error('Error in getValidationHistory:', error);
      throw error;
    });
 
export const getTemplateRules = (templateId: number) =>
  api.get<{ success: boolean; rules: Record<string, string[]> }>(`/template/${templateId}/rules`)
    .then((response) => {
      const rules = response.data.rules || {};
      Object.keys(rules).forEach((key) => {
        if (!Array.isArray(rules[key])) {
          rules[key] = [];
        }
      });
      return { ...response, data: { success: response.data.success, rules } };
    });
 
export const updateTemplateRules = (templateId: number, data: { rules: Record<string, string[]> }) =>
  api.post<{ success: boolean }>(`/template/${templateId}/rules`, data);
 
export const deleteTemplate = (templateId: number) =>
  api.delete<{ success: boolean; message: string }>(`/delete-template/${templateId}`);
 
export const getValidationCorrections = (historyId: number) =>
  api.get<{ success: boolean; headers: string[]; corrections: Correction[] }>(
    `/validation-corrections/${historyId}`
  );
 
export const deleteValidation = (historyId: number) =>
  api.delete<{ success: boolean; message: string }>(`/delete-validation/${historyId}`);
 
export const deleteRule = (ruleId: number) =>
  api.delete<{ success: boolean; message: string }>(`/rules/${ruleId}`)
    .then((response) => {
      console.log('deleteRule response:', response.data);
      return response;
    })
    .catch((error) => {
      console.error('deleteRule error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });


export const validateGenericTemplate = (templateId: number) =>
  api.get<{
    success: boolean;
    error_cell_locations: Record<string, ErrorLocation[]>;
    data_rows: Record<string, any>[];
  }>(`/validate-generic/${templateId}`)
    .then((response) => {
      console.log('validateGenericTemplate response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to validate generic');
      }
      return response;
    })
    .catch((error) => {
      console.error('validateGenericTemplate error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });

export const validateCustomTemplate = (templateId: number, useCorrected: boolean) =>
  api.get<{
    success: boolean;
    error_cell_locations: Record<string, ErrorLocation[]>;
    data_rows: Record<string, any>[];
  }>(`/validate-custom/${templateId}?use_corrected=${useCorrected}`)
    .then((response) => {
      console.log('validateCustomTemplate response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to validate custom');
      }
      return response;
    })
    .catch((error) => {
      console.error('validateCustomTemplate error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });

export const validateRow = (templateId: number, rowIndex: number, updatedRow: Record<string, string>, useCorrected: boolean) =>
  api.post<{
    success: boolean;
    valid: boolean;
    errors: { column: string; rule_failed: string; reason: string }[];
    updated_data_row: Record<string, any>;
  }>(`/validate-row/${templateId}`, { row_index: rowIndex, updated_row: updatedRow, use_corrected: useCorrected })
    .then((response) => {
      console.log('validateRow response:', response.data);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to validate row');
      }
      return response;
    })
    .catch((error) => {
      console.error('validateRow error:', error.response?.data || error.message);
      throw error.response?.data || error;
    });

// SFTP functions
export const connectSFTP = async (sftpData: {
  hostname: string;
  username: string;
  password: string;
  port?: number;
  path: string;
}) => {
  console.log('Calling /connect-sftp with data:', {
    hostname: sftpData.hostname,
    username: sftpData.username,
    password: '************',
    port: sftpData.port || 22,
    path: sftpData.path,
  });
 
  try {
    const response = await api.post<SFTPConnectionResponse>('/connect-sftp', {
      hostname: sftpData.hostname.trim(),
      username: sftpData.username.trim(),
      password: sftpData.password,
      port: sftpData.port || 22,
      path: sftpData.path.trim() || '/',
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to connect to SFTP server';
    console.error('Error in connectSFTP:', errorMessage);
    throw new Error(errorMessage);
  }
};
 
export const fetchFromSFTP = async (sftpData: {
  hostname: string;
  username: string;
  password: string;
  remote_file_path: string;
}) => {
  console.log('Calling /sftp-fetch with data:', {
    hostname: sftpData.hostname,
    username: sftpData.username,
    password: '************',
    remote_file_path: sftpData.remote_file_path,
  });
 
  // Validate inputs
  if (!sftpData.hostname || !sftpData.username || !sftpData.password || !sftpData.remote_file_path) {
    throw new Error('Missing required SFTP fetch parameters');
  }
 
  const formData = new FormData();
  formData.append('hostname', sftpData.hostname.trim());
  formData.append('username', sftpData.username.trim());
  formData.append('password', sftpData.password);
  formData.append('remote_file_path', sftpData.remote_file_path.trim());
 
  try {
    const response = await api.post<SFTPFetchResponse>('/sftp-fetch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch file from SFTP';
    console.error('Error in fetchFromSFTP:', errorMessage);
    throw new Error(errorMessage);
  }
};
 
export const listSftpFiles = (sftpData: {
  hostname: string;
  username: string;
  password: string;
  port?: number;
  folder_path: string;
}) => {
  const formData = new FormData();
  formData.append('hostname', sftpData.hostname.trim());
  formData.append('username', sftpData.username.trim());
  formData.append('password', sftpData.password);
  formData.append('port', sftpData.port?.toString() || '22');
  formData.append('folder_path', sftpData.folder_path.trim());
 
  return api.post<{ success: boolean; files: FileEntry[] }>('/sftp-list-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
 
 
export const setValidationFrequency = (templateId: number, data: { validation_frequency: string }) =>
  api.post<{ success: boolean; message: string }>(`/template/${templateId}/frequency`, data);
 
export const approveSftpFile = (templateId: number, sftpData: {
  hostname: string;
  username: string;
  password: string;
  folder_path: string;
  corrected_file_path: string;
}) => {
  const formData = new FormData();
  formData.append('hostname', sftpData.hostname.trim());
  formData.append('username', sftpData.username.trim());
  formData.append('password', sftpData.password);
  formData.append('folder_path', sftpData.folder_path.trim());
  formData.append('corrected_file_path', sftpData.corrected_file_path);
 
  return api.post<{ success: boolean; message: string }>(`/sftp-approve/${templateId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
 
export const logoutSFTP = () =>
  api.post<{ success: boolean; message: string }>('/sftp-logout');
 
export default api;