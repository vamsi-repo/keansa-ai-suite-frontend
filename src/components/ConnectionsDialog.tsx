import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog";
import localIcon from "../images/Local.png";
import erpIcon from "../images/erp.png";
import sftpIcon from "../images/sftp-icon.png";
import { useNavigate } from "react-router-dom";

type ConnectionsDialogProps = {
  children: React.ReactNode;
};

export const ConnectionsDialog: React.FC<ConnectionsDialogProps> = ({ children }) => {
  const navigate = useNavigate();
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl p-10">
        <DialogHeader>
          <DialogTitle>Select Connection Type</DialogTitle>
        </DialogHeader>
        <div className="flex flex-row gap-4 mt-2 justify-center items-center">
          <button
            className="flex flex-col items-center p-2 border rounded hover:bg-gray-100 focus:outline-none"
            onClick={() => navigate("/data-validations")}
          >
            <img src={localIcon} alt="Local" className="w-12 h-12 mb-1" />
            <span className="text-xs font-medium">Local</span>
          </button>
          <button
            className="flex flex-col items-center p-2 border rounded hover:bg-gray-100 focus:outline-none"
            disabled
          >
            <img src={erpIcon} alt="ERP" className="w-12 h-12 mb-1" />
            <span className="text-xs font-medium">ERP</span>
          </button>
          <button
            className="flex flex-col items-center p-2 border rounded hover:bg-gray-100 focus:outline-none"
            onClick={() => navigate("/auto-data-validation")}
          >
            <img src={sftpIcon} alt="SFTP" className="w-12 h-12 mb-1" />
            <span className="text-xs font-medium">SFTP</span>
          </button>
        </div>
        <DialogClose asChild>
          <button className="mt-4 w-full py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm font-medium">Close</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
