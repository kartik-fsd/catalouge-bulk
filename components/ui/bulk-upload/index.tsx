import React, { useMemo } from "react";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  Loader,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type {
  ProcessingStatusProps,
  DropZoneProps,
  FileItemProps,
  FileListProps,
  StatusItemProps,
  UploadButtonProps,
  ProcessingStage,
} from "@/types/types";
import { PROCESSING_STAGES, UI_MESSAGES, UPLOAD_CONFIG } from "@/utils/config";
import { formatFileSize } from "@/utils/utils";

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  totalFiles,
  processedFiles,
  failedFiles,
  isProcessing,
  stage,
  onCancel,
}) => {
  const progress = useMemo(
    () =>
      Number.isFinite(totalFiles) && totalFiles > 0
        ? (processedFiles / totalFiles) * 100
        : 0,
    [processedFiles, totalFiles]
  );

  const successFiles = useMemo(
    () => Math.max(0, (processedFiles || 0) - (failedFiles || 0)),
    [processedFiles, failedFiles]
  );

  const getMessage = (currentStage: ProcessingStage): string => {
    return UI_MESSAGES[currentStage] || "";
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Processing Status</h3>
        {isProcessing && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-red-500 hover:text-red-600"
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{getMessage(stage)}</span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              stage === PROCESSING_STAGES.ERROR
                ? "bg-red-500"
                : stage === PROCESSING_STAGES.COMPLETED
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          <StatusItem
            icon={Clock}
            value={totalFiles || 0}
            label="Total Files"
            color="blue"
          />
          <StatusItem
            icon={CheckCircle}
            value={successFiles}
            label="Processed"
            color="green"
          />
          <StatusItem
            icon={XCircle}
            value={failedFiles || 0}
            label="Failed"
            color="red"
          />
          <StatusItem
            icon={getStageIcon(stage)}
            value={Math.round(progress) || 0}
            label="Progress"
            color={getStageColor(stage)}
          />
        </div>

        {isProcessing && (
          <p className="text-sm text-gray-500 mt-4">
            {stage === PROCESSING_STAGES.UPLOADING
              ? "Uploading files. Please don't close this window."
              : "Processing large batches may take several minutes. Please keep this window open."}
          </p>
        )}
      </div>
    </div>
  );
};

const getStageIcon = (stage: ProcessingStage) => {
  switch (stage) {
    case PROCESSING_STAGES.UPLOADING:
    case PROCESSING_STAGES.VALIDATING:
    case PROCESSING_STAGES.EXTRACTING:
    case PROCESSING_STAGES.PREPARING:
      return Upload;
    case PROCESSING_STAGES.PROCESSING:
    case PROCESSING_STAGES.ANALYZING:
    case PROCESSING_STAGES.GENERATING:
      return Loader;
    case PROCESSING_STAGES.COMPLETED:
      return CheckCircle;
    case PROCESSING_STAGES.ERROR:
      return XCircle;
    default:
      return Clock;
  }
};

const getStageColor = (stage: ProcessingStage): string => {
  switch (stage) {
    case PROCESSING_STAGES.COMPLETED:
      return "green";
    case PROCESSING_STAGES.ERROR:
      return "red";
    default:
      return "blue";
  }
};

export const StatusItem: React.FC<StatusItemProps> = ({
  icon: Icon,
  value,
  label,
  color,
}) => (
  <div className="flex items-center space-x-2">
    <Icon className={`h-5 w-5 text-${color}-500`} />
    <div>
      <div className="text-sm font-medium">
        {Number.isFinite(value) ? value : 0}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

export const FileList: React.FC<FileListProps> = React.memo(
  ({ files, onRemove, onRemoveAll }) => (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium text-gray-700">
          Selected files ({files.length}/{UPLOAD_CONFIG.MAX_FILES}):
        </div>
        <Button
          variant="ghost"
          onClick={onRemoveAll}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Remove all
        </Button>
      </div>

      <div className="max-h-60 overflow-y-auto border rounded divide-y">
        {files.map((file, index) => (
          <FileItem
            key={`${file.name}-${index}`}
            file={file}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>
    </div>
  )
);

FileList.displayName = "FileList";

export const FileItem: React.FC<FileItemProps> = React.memo(
  ({ file, onRemove }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50">
      <div className="flex items-center min-w-0">
        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="ml-2 text-sm text-gray-600 truncate">{file.name}</span>
        <span className="ml-2 text-xs text-gray-400">
          ({formatFileSize(file.size)})
        </span>
      </div>
      <Button
        variant="ghost"
        onClick={onRemove}
        className="ml-4 text-gray-400 hover:text-red-500"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
);

FileItem.displayName = "FileItem";

export const DropZone: React.FC<DropZoneProps> = React.memo(
  ({ getRootProps, getInputProps, isDragActive, isProcessing }) => (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
      ${
        isDragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }
      ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        Drag & drop images or ZIP files here, or click to select
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Supported formats: JPG, PNG, ZIP (max {UPLOAD_CONFIG.MAX_FILES} files,{" "}
        {formatFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE)} per file)
      </p>
    </div>
  )
);

DropZone.displayName = "DropZone";

export const ErrorAlert: React.FC<{ message: string }> = React.memo(
  ({ message }) => (
    <Alert variant="destructive" className="mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
);

ErrorAlert.displayName = "ErrorAlert";

export const UploadButton: React.FC<UploadButtonProps> = React.memo(
  ({ onClick, disabled, isProcessing, stage }) => {
    const getButtonText = (stage: ProcessingStage): string => {
      if (isProcessing) {
        return UI_MESSAGES[stage] || "Processing...";
      }
      if (stage === PROCESSING_STAGES.COMPLETED) {
        return "Download Catalog";
      }
      return "Upload and Process Files";
    };

    const getButtonStyle = (stage: ProcessingStage): string => {
      if (disabled) {
        return "bg-gray-400";
      }

      switch (stage) {
        case PROCESSING_STAGES.ERROR:
          return "bg-red-500 hover:bg-red-600";
        case PROCESSING_STAGES.COMPLETED:
          return "bg-green-500 hover:bg-green-600";
        default:
          return "bg-blue-500 hover:bg-blue-600";
      }
    };

    const isButtonDisabled =
      stage === PROCESSING_STAGES.COMPLETED ? false : disabled || isProcessing;

    return (
      <Button
        onClick={onClick}
        disabled={isButtonDisabled}
        className={`mt-6 w-full py-2 px-4 rounded-md text-white flex items-center justify-center ${getButtonStyle(
          stage
        )}`}
      >
        {isProcessing ? (
          <>
            <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
            {getButtonText(stage)}
          </>
        ) : stage === PROCESSING_STAGES.COMPLETED ? (
          <>
            <CheckCircle className="-ml-1 mr-3 h-5 w-5" />
            {getButtonText(stage)}
          </>
        ) : (
          getButtonText(stage)
        )}
      </Button>
    );
  }
);
UploadButton.displayName = "UploadButton";

export const Header: React.FC = () => (
  <div className="text-center mb-8">
    <h1 className="text-3xl font-bold text-gray-900">
      Product Catalog Generator
    </h1>
    <p className="mt-2 text-gray-600">
      Upload product images to generate descriptions and bullet points
    </p>
  </div>
);

export const Footer: React.FC = React.memo(() => (
  <div className="mt-8 text-center text-sm text-gray-500">
    <p>
      Maximum {UPLOAD_CONFIG.MAX_FILES} files,{" "}
      {formatFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE)} per file
    </p>
    <p>Total size limit: {formatFileSize(UPLOAD_CONFIG.MAX_TOTAL_SIZE)}</p>
  </div>
));

Footer.displayName = "Footer";
