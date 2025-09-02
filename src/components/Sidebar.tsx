import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import * as apiService from '@/services/api';
import { Home, LogOut, Settings, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import keansaLogo from '@/images/keansa_logo.png';
import ruleConfigurationsIcon from '@/images/Rule Configurations.png';
import dataValidationsIcon from '@/images/Data Validations.png';
import autodatavalidationicon from '../images/sftp-icon.png';
import rulemanagementicon from '../images/Rule Management.png';
import errorcorrectionanddetectioninco from '../images/Error Correction & Detection.png';
import masterdatamanagementicon from '../images/Master Data Management.png';
import datamapingicon from '../images/Data Mapping.png';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, setIsAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast({
        title: 'Success',
        description: 'Logged out successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  const isActiveSection = (sec: string) => section === sec ? 'bg-gray-200' : '';

  return (
    <div className={`bg-white shadow-md flex flex-col h-screen transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`} style={{ minWidth: collapsed ? 64 : 256 }}>
      <div className={`p-4 border-b flex items-center ${collapsed ? 'justify-center' : 'space-x-2'}`}>
        <img
          src={keansaLogo}
          alt="Keansa Logo"
          className="w-8 h-auto"
        />
        {!collapsed && <h1 className="text-2xl font-bold text-gray-800">Keansa AI Suite</h1>}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={`ml-auto p-1 rounded hover:bg-gray-200 transition-colors ${collapsed ? '' : 'ml-2'}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      <nav className={`flex-1 p-4 space-y-2 ${collapsed ? 'p-2' : 'p-4'}`}>
        <Link to="/dashboard?section=data-mapping">
          <Button
            variant="ghost"
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} ${isActiveSection('data-mapping')}`}
          >
            <img src={datamapingicon} alt="Data Mapping" className="h-5 w-5 min-w-5 min-h-5" style={{ width: 20, height: 20 }} />
            {!collapsed && <span className="ml-2">Data Mapping</span>}
          </Button>
        </Link>
        <Link to="/dashboard?section=master-data-management">
          <Button
            variant="ghost"
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} ${isActiveSection('master-data-management')}`}
          >
            <img src={masterdatamanagementicon} alt="Master Data Management" className="h-5 w-5 min-w-5 min-h-5" style={{ width: 20, height: 20 }} />
            {!collapsed && <span className="ml-2">Master Data Management</span>}
          </Button>
        </Link>
        <Link to="/dashboard?section=error-correction-detection">
          <Button
            variant="ghost"
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} ${isActiveSection('error-correction-detection')}`}
          >
            <img src={errorcorrectionanddetectioninco} alt="Error correction detection" className="h-5 w-5 min-w-5 min-h-5" style={{ width: 20, height: 20 }} />
            {!collapsed && <span className="ml-2">Error Correction & detection</span>}
          </Button>
        </Link>
      </nav>
      <div className={`p-4 border-t ${collapsed ? 'flex flex-col items-center p-2' : ''}`}>
        <Button variant="ghost" className={`w-full justify-start ${collapsed ? 'p-2' : ''}`}>
          <Settings className="h-5 w-5" />
          {!collapsed && <span className="ml-2">Settings</span>}
        </Button>
        <Button variant="ghost" className={`w-full justify-start text-red-600 ${collapsed ? 'p-2' : ''}`} onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
};