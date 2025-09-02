import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import connectionsIcon from '@/images/sftp-icon.png';
import erpIcon from '@/images/erp.png';
import localIcon from '@/images/local.png';

const DataValidationsPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleIconClick = (path: string) => {
    setIsOpen(false);
    if (path) navigate(path);
  };

  return (
    <>
      <Button
        className="shadow-md hover:shadow-lg transition-shadow cursor-pointer w-32"
        onClick={() => setIsOpen(true)}
      >
        <img src={dataValidationsIcon} alt="Data Validations" className="w-12 h-12 mb-2 mx-auto" />
        <div className="text-xs font-medium text-gray-700 text-center">Data Validations</div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800 text-center mb-6">
              Choose Validation Source
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-around items-center">
            <div
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => handleIconClick('/auto-data-validation')}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 shadow-md">
                <img src={connectionsIcon} alt="Connections" className="w-10 h-10" />
              </div>
              <span className="text-sm font-medium text-gray-700">Connections</span>
            </div>
            <div
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => handleIconClick('')}
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2 shadow-md">
                <img src={erpIcon} alt="ERP" className="w-10 h-10" />
              </div>
              <span className="text-sm font-medium text-gray-700">ERP</span>
            </div>
            <div
              className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => handleIconClick('/data-validations')}
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-md">
                <img src={localIcon} alt="Local" className="w-10 h-10" />
              </div>
              <span className="text-sm font-medium text-gray-700">Local</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DataValidationsPopup;