import React, { useState } from 'react';
     import { useNavigate, useLocation } from 'react-router-dom';
     import { Button } from '../components/ui/button';
     import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
     import { Input } from '../components/ui/input';
     import { Label } from '../components/ui/label';
     import { Sidebar } from '../components/Sidebar';
     import { toast } from '../hooks/use-toast';
     import * as apiService from '../services/api';

     const AutoDataValidation: React.FC = () => {
       const navigate = useNavigate();
       const location = useLocation();
       const { returnTo } = location.state || {};
       const [formData, setFormData] = useState({
         hostname: '',
         username: '',
         password: '',
         port: '22',
         path: '/Uploads',
       });
       const [loading, setLoading] = useState(false);

       const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         setFormData({ ...formData, [e.target.name]: e.target.value });
       };

       const handleSubmit = async (e: React.FormEvent) => {
         e.preventDefault();
         setLoading(true);
         try {
           const response = await apiService.connectSFTP({
             hostname: formData.hostname,
             username: formData.username,
             password: formData.password,
             port: parseInt(formData.port) || 22,
             path: formData.path,
           });
           if (response.success) {
             const sftpCredentials = {
               hostname: formData.hostname,
               username: formData.username,
               password: formData.password,
               port: formData.port,
               path: formData.path,
             };
             localStorage.setItem('sftpCredentials', JSON.stringify(sftpCredentials));
             toast({ title: 'Success', description: response.message, variant: 'default' });
             navigate(returnTo || '/sftp-dashboard', { state: { sftpCredentials } });
           } else {
             toast({ title: 'Error', description: response.message, variant: 'destructive' });
           }
         } catch (error: any) {
           toast({ title: 'Error', description: error.message, variant: 'destructive' });
         } finally {
           setLoading(false);
         }
       };

       return (
         <div className="flex min-h-screen bg-gray-50">
           <Sidebar />
           <div className="flex-1 p-8">
             <Card className="shadow-xl border border-gray-200 rounded-lg">
               <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                 <CardTitle className="text-2xl font-bold text-blue-800">SFTP Connection</CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                 <form onSubmit={handleSubmit} className="space-y-6">
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
                     type="submit"
                     className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                     disabled={loading || !formData.hostname || !formData.username || !formData.password || !formData.path}
                   >
                     {loading ? 'Connecting...' : 'Connect to SFTP'}
                   </Button>
                 </form>
               </CardContent>
             </Card>
           </div>
         </div>
       );
     };

     export default AutoDataValidation;