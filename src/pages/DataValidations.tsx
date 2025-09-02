import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Sidebar } from '../components/Sidebar';
import { FileUpload } from '../components/FileUpload';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';
import * as apiService from '../services/api';
import { format } from 'date-fns';

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
  rule_failed: string; // Include rule_failed for display
}

const DataValidations = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ValidationHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCorrections, setSelectedCorrections] = useState<Correction[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNoRulesDialogOpen, setIsNoRulesDialogOpen] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchHistory = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await apiService.getValidationHistory();
          if (!response.data.success) {
            throw new Error('Failed to load validation history');
          }
          const historyData = response.data.history || {};
          if (typeof historyData !== 'object' || historyData === null) {
            throw new Error('Invalid history data format');
          }
          setHistory(historyData);
        } catch (error: any) {
          console.error('Error fetching validation history:', error);
          setError(error.message || 'Failed to load validation history. Please try again later.');
          toast({
            title: 'Error',
            description: error.message || 'Failed to load validation history.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isAuthenticated]);

  const handleViewCorrections = async (historyId: number) => {
    try {
      const response = await apiService.getValidationCorrections(historyId);
      if (!response.data.success) {
        throw new Error('Failed to load corrections');
      }
      setSelectedCorrections(
        (response.data.corrections || []).map((correction: any) => ({
          ...correction,
          rule_failed: correction.rule_failed ?? 'N/A',
        }))
      );
      setSelectedHeaders(response.data.headers || []);
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching corrections:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to load corrections.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadSuccess = (data: any) => {
    setTemplateId(data.template_id);
    if (!data.has_existing_rules) {
      setIsNoRulesDialogOpen(true);
    } else {
      navigate(`/validate/${data.template_id}?step=4&from=data-validations`);
    }
  };


  // Scrollable accordion for Configuration History (no page-based pagination)
  const templateNames = Object.keys(history);

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Upload Data File for Validation</CardTitle>
              <p className="text-sm text-gray-600">Upload an Excel or CSV file to validate against existing rules</p>
            </CardHeader>
            <CardContent>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Data Validations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading history...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-600">
                  <p>{error}</p>
                  <Button
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                      setHistory({});
                      setTimeout(() => setLoading(false), 0);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : templateNames.length > 0 ? (
                <div className="w-full max-h-[500px] overflow-y-auto pr-2">
                  <Accordion type="single" collapsible className="w-full">
                    {templateNames.map((templateName, index) => {
                      const group = history[templateName];
                      return (
                        <AccordionItem key={templateName} value={`item-${index}`}>
                          <AccordionTrigger>
                            <div className="flex flex-col items-start">
                              <span className="font-semibold">{templateName}</span>
                              <span className="text-sm text-gray-500">
                                Originally Uploaded: {format(new Date(group.original_uploaded_at), 'MMM d, yyyy HH:mm')}
                              </span>
                              <span className="text-sm text-gray-500">
                                Total Data Loads: {group.data_loads.length}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data Load Timestamp</TableHead>
                                  <TableHead>Errors Corrected</TableHead>
                                  <TableHead>Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.data_loads.map((entry) => (
                                  <TableRow key={entry.history_id}>
                                    <TableCell>
                                      {format(new Date(entry.corrected_at), 'MMM d, yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell>{entry.error_count}</TableCell>
                                    <TableCell>
                                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            onClick={() => handleViewCorrections(entry.history_id)}
                                          >
                                            View Corrections
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl">
                                          <DialogHeader>
                                            <DialogTitle>Corrections for {entry.template_name}</DialogTitle>
                                          </DialogHeader>
                                          {selectedCorrections.length > 0 ? (
                                            <div className="overflow-x-auto">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Row Index</TableHead>
                                                    <TableHead>Column Name</TableHead>
                                                    <TableHead>Original Value</TableHead>
                                                    <TableHead>Corrected Value</TableHead>
                                                    <TableHead>Rule Failed</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {selectedCorrections.map((correction, idx) => (
                                                    <TableRow key={idx}>
                                                      <TableCell>{correction.row_index}</TableCell>
                                                      <TableCell>{correction.column_name}</TableCell>
                                                      <TableCell>{correction.original_value || 'NULL'}</TableCell>
                                                      <TableCell>{correction.corrected_value || 'NULL'}</TableCell>
                                                      <TableCell>{correction.rule_failed || 'N/A'}</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          ) : (
                                            <div className="py-4 text-center text-gray-500">
                                              No corrections found.
                                            </div>
                                          )}
                                        </DialogContent>
                                      </Dialog>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No validation history found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Dialog open={isNoRulesDialogOpen} onOpenChange={setIsNoRulesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No Rules Configured</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">No rules configured for this file.</p>
            <div className="mt-4 flex space-x-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                onClick={() => {
                  setIsNoRulesDialogOpen(false);
                  navigate('/rule-configurations');
                }}
              >
                Rule Configurations
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsNoRulesDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DataValidations;