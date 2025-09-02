import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Sidebar } from '../components/Sidebar';
import keansaLogo from '@/images/Keansa_Logo.png';
import dataMapping1 from '@/images/data_maping_1.png';
import dataMapping2 from '@/images/data_maping_2.png';
import dataMapping3 from '@/images/data_maping_3.png';
import mdm1 from '@/images/mdm_1.png';
import mdm2 from '@/images/mdm_2.png';
import mdm3 from '@/images/mdm_3.png';
import ruleConfigurationsIcon from '@/images/Rule Configurations.png';
import dataValidationsIcon from '@/images/Data Validations.png';
import autodatavalidationicon from '../images/sftp-icon.png';
import { ConnectionsDialog } from '../components/ConnectionsDialog';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const params = new URLSearchParams(location.search);
  const section = params.get('section');

  // Scroll to the section based on the query parameter
  useEffect(() => {
    if (section) {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [section]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <img
        src={keansaLogo}
        alt="Keansa Logo"
        className="absolute top-6 right-8 w-20 h-20 z-20"
        style={{ objectFit: 'contain' }}
      />
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Data Sync AI</h1>
        <h2 id="data-mapping" className="text-xl font-semibold mb-4">Data Mapping</h2>
        <div className="grid grid-cols-1 sm:grid-cols-7 md:grid-cols-7 gap-0 mb-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
            <CardHeader className="flex items-center justify-center">
              <img src={dataMapping1} alt="Dummy 1" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Extract</CardTitle>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
            <CardHeader className="flex items-center justify-center">
              <img src={dataMapping2} alt="Dummy 2" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Transform</CardTitle>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
            <CardHeader className="flex items-center justify-center">
              <img src={dataMapping3} alt="Dummy 3" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Load</CardTitle>
            </CardContent>
          </Card>
        </div>
        <h2 id="master-data-management" className="text-xl font-semibold mb-4">Master Data Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-7 md:grid-cols-7 gap-0 mb-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
            <CardHeader className="flex items-center justify-center">
              <img src={mdm1} alt="Dummy 1" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Dimensions</CardTitle>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
            <CardHeader className="flex items-center justify-center">
              <img src={mdm2} alt="Dummy 2" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Information</CardTitle>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
            <CardHeader className="flex items-center justify-center">
              <img src={mdm3} alt="Dummy 3" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Cube</CardTitle>
            </CardContent>
          </Card>
        </div>
        <h2 id="error-correction-detection" className="text-xl font-semibold mb-4">Error Correction & Detection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-7 md:grid-cols-7 gap-0">
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2"
            onClick={() => handleCardClick('/rule-configurations')}
          >
            <CardHeader className="flex items-center justify-center">
              <img src={ruleConfigurationsIcon} alt="Rule Configurations" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Rule Configurations</CardTitle>
            </CardContent>
          </Card>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2"
            onClick={() => handleCardClick('/data-validations')}
          >
            <CardHeader className="flex items-center justify-center">
              <img src={dataValidationsIcon} alt="Data Validations" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
            </CardHeader>
            <CardContent className="text-center p-0">
              <CardTitle className="text-xs font-medium text-gray-700">Data Validation</CardTitle>
            </CardContent>
          </Card>
          <ConnectionsDialog>
            <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32 h-32 flex flex-col items-center justify-center bg-white p-2">
              <CardHeader className="flex items-center justify-center">
                <img src={autodatavalidationicon} alt="Connections" className="w-12 h-12 rounded-none mb-2" style={{ objectFit: 'cover' }} />
              </CardHeader>
              <CardContent className="text-center p-0">
                <CardTitle className="text-xs font-medium text-gray-700">Connections</CardTitle>
              </CardContent>
            </Card>
          </ConnectionsDialog>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;