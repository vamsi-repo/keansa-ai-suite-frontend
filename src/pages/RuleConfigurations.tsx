import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Sidebar } from '../components/Sidebar';
import { FileUpload } from '../components/FileUpload';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';
import * as apiService from '../services/api';
import { format } from 'date-fns';

interface RuleConfigTemplate {
  template_id: number;
  template_name: string;
  created_at: string;
  rule_count: number;
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

const RulesManagement = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ruleTemplates, setRuleTemplates] = useState<RuleConfigTemplate[]>([]);
  const [validationHistory, setValidationHistory] = useState<ValidationHistory>({});
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchTemplates = async () => {
        try {
          setLoadingTemplates(true);
          console.log('Fetching rule configurations for user:', user.email, 'user_id:', user.id);
          const response = await apiService.getRuleConfigurations();
          console.log('getRuleConfigurations response:', response.data);
          if (response.data.success) {
            let templates = response.data.templates || [];
            // Check navigation state for updated templates
            if (location.state?.updatedTemplates) {
              templates = location.state.updatedTemplates;
              console.log('Using updated templates from navigation state:', templates);
            }
            setRuleTemplates(templates);
            if (templates.length === 0) {
              console.warn('No templates with configured rules found for user_id:', user.id);
              toast({
                title: 'Info',
                description: 'No templates with configured rules found. Please configure a template.',
                variant: 'default',
              });
            }
          } else {
            throw new Error('Failed to fetch rule configurations: ' + (response.data.message || 'No success'));
          }
        } catch (error: any) {
          console.error('Error fetching rule configurations:', error.message || error);
          toast({
            title: 'Error',
            description: 'Failed to load rule configurations. Please try again or contact support.',
            variant: 'destructive',
          });
        } finally {
          setLoadingTemplates(false);
        }
      };

      const fetchValidationHistory = async () => {
        try {
          setLoadingHistory(true);
          console.log('Fetching validation history for user:', user.email, 'user_id:', user.id);
          const response = await apiService.getValidationHistory();
          console.log('getValidationHistory response:', response.data);
          if (response.data.success) {
            setValidationHistory(response.data.history || {});
            if (Object.keys(response.data.history).length === 0) {
              console.warn('No validation history found for user_id:', user.id);
              toast({
                title: 'Info',
                description: 'No validation history found. Upload and validate files to see history.',
                variant: 'default',
              });
            }
          } else {
            throw new Error('Failed to fetch validation history: ' + (response.data.message || 'No success'));
          }
        } catch (error: any) {
          console.error('Error fetching validation history:', error.message || error);
          toast({
            title: 'Error',
            description: 'Failed to load validation history. Please try again or contact support.',
            variant: 'destructive',
          });
        } finally {
          setLoadingHistory(false);
        }
      };

      fetchTemplates();
      fetchValidationHistory();
    } else {
      console.warn('User not authenticated or user data missing');
      setRuleTemplates([]);
      setValidationHistory({});
      setLoadingTemplates(false);
      setLoadingHistory(false);
    }
  }, [isAuthenticated, user, location.state]);

  const handleUpdate = (templateId: number) => {
    navigate(`/validate/${templateId}?step=3&from=rule-configurations`);
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        const response = await apiService.deleteTemplate(templateId);
        if (response.data.success) {
          setRuleTemplates(ruleTemplates.filter((template) => template.template_id !== templateId));
          setValidationHistory((prev) => {
            const updatedHistory = { ...prev };
            Object.keys(updatedHistory).forEach((key) => {
              if (updatedHistory[key].data_loads.some((entry) => entry.template_id === templateId)) {
                delete updatedHistory[key];
              }
            });
            return updatedHistory;
          });
          toast({
            title: 'Success',
            description: 'Template deleted successfully.',
            variant: 'default',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete template.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteValidation = async (historyId: number, templateName: string) => {
    if (window.confirm('Are you sure you want to delete this validation history entry?')) {
      try {
        const response = await apiService.deleteValidation(historyId);
        if (response.data.success) {
          setValidationHistory((prev) => {
            const updatedHistory = { ...prev };
            const baseTemplateName = templateName.replace('_corrected.xlsx', '').replace('_corrected.csv', '');
            if (updatedHistory[baseTemplateName]) {
              updatedHistory[baseTemplateName].data_loads = updatedHistory[baseTemplateName].data_loads.filter(
                (entry) => entry.history_id !== historyId
              );
              if (updatedHistory[baseTemplateName].data_loads.length === 0) {
                delete updatedHistory[baseTemplateName];
              }
            }
            return updatedHistory;
          });
          toast({
            title: 'Success',
            description: 'Validation history entry deleted successfully.',
            variant: 'default',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete validation history entry.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUploadSuccess = (data: any) => {
    if (data.success) {
      if (data.has_existing_rules) {
        setRuleTemplates((prev) => [
          {
            template_id: data.template_id,
            template_name: data.file_name,
            created_at: new Date().toISOString(),
            rule_count: 1,
          },
          ...prev,
        ]);
      }
      const step = data.has_existing_rules ? 3 : 1;
      navigate(`/validate/${data.template_id}?step=${step}&from=rule-configurations`);
    } else {
      toast({
        title: 'Error',
        description: data.error || 'Failed to upload file.',
        variant: 'destructive',
      });
    }
  };


  // Filter templates to show only original files
  const originalTemplates = ruleTemplates.filter(
    (template) => !template.template_name.includes('_corrected')
  );

  // Pagination state for Configuration History
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(originalTemplates.length / itemsPerPage);
  const paginatedTemplates = originalTemplates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (!isAuthenticated) {
    console.warn('Rendering null due to unauthenticated user');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Rules Configuration</CardTitle>
              <p className="text-sm text-gray-600">Upload a template to configure validation rules</p>
            </CardHeader>
            <CardContent>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Configuration History</CardTitle>
              <p className="text-sm text-gray-600">Templates with configured validation rules</p>
            </CardHeader>
            <CardContent className="flex flex-col h-[400px]">
              {loadingTemplates ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : originalTemplates.length > 0 ? (
                <>
                  <div className="flex-1 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Rules Configured</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTemplates.map((template) => (
                          <TableRow key={template.template_id}>
                            <TableCell>{template.template_name}</TableCell>
                            <TableCell>
                              {format(new Date(template.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>{template.rule_count}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => handleUpdate(template.template_id)}
                                >
                                  Update
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDeleteTemplate(template.template_id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Sticky Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="sticky bottom-0 bg-white pt-2 flex justify-center items-center space-x-2 border-t mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No templates with configured rules found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RulesManagement;