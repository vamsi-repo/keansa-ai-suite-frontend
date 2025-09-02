import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useValidation } from '@/contexts/ValidationContext';
import * as apiService from '@/services/api';

interface FileUploadProps {
  onUploadSuccess: (data: any) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const { templates } = useValidation();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an Excel, CSV, or TXT file.',
          variant: 'destructive',
        });
        return;
      }

      const fileName = file.name;
      if (templates.some((template) => template.template_name === fileName && template.status === 'ACTIVE')) {
        console.log(`Template already exists for ${fileName}, checking rules...`);
        // Template existence will be handled by the backend
      } else {
        console.log(`New template for ${fileName}, starting validation process...`);
      }

      setUploading(true);
      try {
        console.log(`Uploading file: ${fileName}`);
        const response = await apiService.uploadFile(file);
        const data = response.data;
        console.log('Upload response:', data);
        onUploadSuccess(data);
      } catch (error: any) {
        console.error('Upload error:', error);
        console.error('Error response:', error.response?.data);
        toast({
          title: 'Upload Failed',
          description: error.response?.data?.error || 'An error occurred while uploading the file.',
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    },
    [templates, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-4 text-sm text-gray-600">
        Drag and drop your file here
        <br />
        or click to browse files (Excel, CSV, TXT)
      </p>
      <Button className="mt-4" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Select File'}
      </Button>
    </div>
  );
};