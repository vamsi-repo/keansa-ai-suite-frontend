
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sidebar } from '../components/Sidebar';
import { toast } from '../hooks/use-toast';
import * as apiService from '../services/api';
import { Settings, Home, Server, LogOut, Download } from 'lucide-react';

interface FileEntry {
  filename: string;
  template_id: number | null;
  status: 'Errors Detected' | 'File Not Configured';
  validation_frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  first_identified_at: string | null;
}

interface ValidatedFile {
  filename: string;
  timestamp: string;
}

const SFTPDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCredentials = location.state?.sftpCredentials || JSON.parse(localStorage.getItem('sftpCredentials') || '{}');
  const [formData, setFormData] = useState({
    hostname: initialCredentials.hostname || '',
    username: initialCredentials.username || '',
    password: initialCredentials.password || '',
    path: initialCredentials.path || '/',
    port: initialCredentials.port || '22',
  });
  const [systemFiles, setSystemFiles] = useState<FileEntry[]>([]);
  const [validatedFiles, setValidatedFiles] = useState<ValidatedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY' | ''>('');
  const [activeTab, setActiveTab] = useState<'system' | 'validated'>('system');

  useEffect(() => {
    console.log('Active tab changed:', activeTab);
    fetchFiles();
  }, [activeTab, formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedFormData = { ...prev, [name]: value };
      localStorage.setItem('sftpCredentials', JSON.stringify(updatedFormData));
      return updatedFormData;
    });
  };

  const fetchFiles = async () => {
    if (!formData.hostname || !formData.username || !formData.password || !formData.path) {
      console.warn('SFTP credentials missing:', formData);
      toast({
        title: 'Error',
        description: 'SFTP credentials are missing. Please configure SFTP settings.',
        variant: 'destructive',
      });
      setConfigDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'system') {
        console.log('Fetching system files from Inbound folder');
        const response = await apiService.listSftpFiles({
          hostname: formData.hostname,
          username: formData.username,
          password: formData.password,
          port: parseInt(formData.port) || 22,
          folder_path: formData.path,
        });
        if (response.data.success) {
          console.log('System files fetched:', response.data.files);
          setSystemFiles(response.data.files);
        } else {
          console.error('Failed to list system files:', response.data && 'message' in response.data ? response.data.message : 'Unknown error');
          toast({
            title: 'Error',
            description: (response.data && 'message' in response.data ? response.data.message : 'Failed to list system files.'),
            variant: 'destructive',
          });
        }
      } else if (activeTab === 'validated') {
        console.log('Fetching validated files from Outbound folder');
        const response = await apiService.listSftpOutboundFiles({
          hostname: formData.hostname,
          username: formData.username,
          password: formData.password,
          port: parseInt(formData.port) || 22,
          folder_path: formData.path,
        });
        if (response.data.success) {
          console.log('Validated files fetched:', response.data.files);
          setValidatedFiles(response.data.files);
        } else {
          const errorMsg = (response.data && 'message' in response.data) ? response.data.message : 'Failed to list validated files.';
          console.error('Failed to list validated files:', errorMsg);
          toast({
            title: 'Error',
            description: errorMsg,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching files:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to list files.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (file: FileEntry) => {
    if (!formData.hostname || !formData.username || !formData.password || !formData.path) {
      toast({
        title: 'Error',
        description: 'SFTP credentials are missing. Please configure SFTP settings.',
        variant: 'destructive',
      });
      setConfigDialogOpen(true);
      return;
    }

    try {
      console.log('Fetching file:', file.filename);
      const response = await apiService.fetchFromSFTP({
        hostname: formData.hostname,
        username: formData.username,
        password: formData.password,
        remote_file_path: `${formData.path}/Inbound/${file.filename}`,
      });
      if (response.success) {
        const step = file.status === 'Errors Detected' ? 4 : 1;
        navigate(`/validate/${response.template_id}?step=${step}&from=auto-data-validation`, {
          state: { sftpCredentials: formData },
        });
        if (file.status === 'File Not Configured') {
          setSystemFiles((prev) =>
            prev.map((f) =>
              f.filename === file.filename ? { ...f, status: 'Errors Detected', template_id: response.template_id } : f
            )
          );
        }
      } else {
        console.error('Failed to fetch file:', response.error);
        toast({
          title: 'Error',
          description: response.error || 'Failed to fetch file.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching file:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      console.log('Downloading file:', filename);
      const tempFilePath = `${formData.path}/Outbound/${filename}`;
      const response = await apiService.fetchFromSFTP({
        hostname: formData.hostname,
        username: formData.username,
        password: formData.password,
        remote_file_path: tempFilePath,
      });
      if (response.success) {
        apiService.downloadFile(response.file_name);
        toast({
          title: 'Success',
          description: 'File download initiated.',
          variant: 'default',
        });
      } else {
        console.error('Failed to fetch file for download:', response.error);
        throw new Error(response.error || 'Failed to fetch file for download.');
      }
    } catch (error: any) {
      console.error('Error downloading file:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download file.',
        variant: 'destructive',
      });
    }
  };

  const handleSettings = (file: FileEntry) => {
    setSelectedFile(file);
    setFrequency(file.validation_frequency || '');
    setSettingsDialogOpen(true);
  };

  const saveFrequency = async () => {
    if (!selectedFile?.template_id || !frequency) return;
    try {
      console.log('Saving validation frequency:', frequency, 'for template:', selectedFile.template_id);
      const response = await apiService.setValidationFrequency(selectedFile.template_id, {
        validation_frequency: frequency,
      });
      if (response.data.success) {
        setSystemFiles((prev) =>
          prev.map((f) =>
            f.filename === selectedFile.filename ? { ...f, validation_frequency: frequency } : f
          )
        );
        toast({
          title: 'Success',
          description: 'Validation frequency updated.',
          variant: 'default',
        });
        setSettingsDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error updating frequency:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update frequency.',
        variant: 'destructive',
      });
    }
  };

  const handleTerminateSession = async () => {
    try {
      console.log('Terminating SFTP session');
      const response = await apiService.logoutSFTP();
      if (response.data.success) {
        localStorage.removeItem('sftpCredentials');
        setFormData({
          hostname: '',
          username: '',
          password: '',
          path: '/',
          port: '22',
        });
        toast({
          title: 'Success',
          description: response.data.message || 'SFTP session terminated successfully.',
          variant: 'default',
        });
        navigate('/auto-data-validation');
      } else {
        console.error('Failed to terminate SFTP session:', response.data.message);
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to terminate SFTP session.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error terminating session:', error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to terminate SFTP session.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <nav className="flex justify-between items-center mb-6 bg-blue-100 p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-800">SFTP Files</h1>
            <Button
              variant="outline"
              onClick={() => navigate('/auto-data-validation')}
              className="flex items-center space-x-2"
            >
              <Home className="h-5 w-5" />
              <span>Back to SFTP Login</span>
            </Button>
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => setConfigDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
            >
              <Server className="h-5 w-5" />
              <span>SFTP Configuration</span>
            </Button>
            <Button
              onClick={handleTerminateSession}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            >
              <LogOut className="h-5 w-5" />
              <span>Terminate Session</span>
            </Button>
          </div>
        </nav>
        <Card className="shadow-xl border border-gray-200 rounded-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-blue-800">SFTP File Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'system' | 'validated')}>
              <TabsList className="mb-4">
                <TabsTrigger value="system">Inbound Files</TabsTrigger>
                <TabsTrigger value="validated">Outbound Files</TabsTrigger>
              </TabsList>
              <TabsContent value="system">
                <Button
                  type="button"
                  onClick={fetchFiles}
                  className="bg-blue-600 hover:bg-blue-700 text-white transition-colors mb-6"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Files'}
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Settings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemFiles.map((file) => (
                      <TableRow key={file.filename}>
                        <TableCell>{file.filename}</TableCell>
                        <TableCell>{file.status}</TableCell>
                        <TableCell>
                          <Button
                            className={file.status === 'Errors Detected' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}
                            onClick={() => handleAction(file)}
                          >
                            {file.status === 'Errors Detected' ? 'Validate' : 'Configure'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            onClick={() => handleSettings(file)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
                          >
                            <Settings className="h-5 w-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {systemFiles.length === 0 && !loading && (
                  <p className="text-center text-gray-600 mt-4">No files found in the Inbound folder.</p>
                )}
              </TabsContent>
              <TabsContent value="validated">
                <Button
                  type="button"
                  onClick={fetchFiles}
                  className="bg-blue-600 hover:bg-blue-700 text-white transition-colors mb-6"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh Files'}
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedFiles.map((file) => (
                      <TableRow key={file.filename}>
                        <TableCell>{file.filename}</TableCell>
                        <TableCell>{new Date(file.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleDownload(file.filename)}
                          >
                            <Download className="h-5 w-5 mr-2" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {validatedFiles.length === 0 && !loading && (
                  <p className="text-center text-gray-600 mt-4">No files found in the Outbound folder.</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>SFTP Configuration</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div>
                <Label htmlFor="hostname">SFTP Hostname</Label>
                <Input
                  id="hostname"
                  name="hostname"
                  type="text"
                  value={formData.hostname}
                  onChange={handleInputChange}
                  placeholder="e.g., sftp.example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="SFTP username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="SFTP password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="port">Port (default: 22)</Label>
                <Input
                  id="port"
                  name="port"
                  type="number"
                  value={formData.port}
                  onChange={handleInputChange}
                  placeholder="e.g., 22"
                />
              </div>
              <div>
                <Label htmlFor="path">SFTP Folder Path</Label>
                <Input
                  id="path"
                  name="path"
                  type="text"
                  value={formData.path}
                  onChange={handleInputChange}
                  placeholder="e.g., /Uploads"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Specify the folder path containing Inbound, Outbound, and Processing folders.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setConfigDialogOpen(false);
                  fetchFiles();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                disabled={!formData.hostname || !formData.username || !formData.password || !formData.path}
              >
                Save and Refresh
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Validation Frequency for {selectedFile?.filename}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>First Identified: {selectedFile?.first_identified_at || 'N/A'}</p>
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
                onClick={saveFrequency}
                disabled={!frequency}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SFTPDashboard;