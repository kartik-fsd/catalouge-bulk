/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Card, CardContent } from "@/components/ui/card";
import {
  ProcessingStats,
  ProcessingStage,
  ProcessedResult,
} from "@/types/types";
import { validateFiles, processZipFile } from "@/utils/utils";
import {
  DropZone,
  ErrorAlert,
  FileList,
  Footer,
  Header,
  ProcessingStatus,
  UploadButton,
} from "@/components/ui/bulk-upload";
import {
  API_CONFIG,
  ERROR_MESSAGES,
  PROCESSING_STAGES,
  UPLOAD_CONFIG,
} from "@/utils/config";

export default function CatalogGenrator() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<ProcessingStage>(PROCESSING_STAGES.IDLE);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    stage: PROCESSING_STAGES.IDLE,
    progress: 0,
  });

  const updateProcessingStage = (newStage: ProcessingStage, progress = 0) => {
    setStage(newStage);
    setProcessingStats((prev) => ({
      ...prev,
      stage: newStage,
      progress,
    }));
  };

  const generateExcel = (results: ProcessedResult[]) => {
    const worksheet = XLSX.utils.json_to_sheet(
      results.map((result) => ({
        "Image Name": result.imageName,
        "Image URL": result.imageUrl || "",
        Description: result.description,
        "Bullet Point 1": result.bulletPoints[0] || "",
        "Bullet Point 2": result.bulletPoints[1] || "",
        "Bullet Point 3": result.bulletPoints[2] || "",
        "Bullet Point 4": result.bulletPoints[3] || "",
        "Bullet Point 5": result.bulletPoints[4] || "",
        "Processing Time (ms)": result.processingTime,
        Error: result.error || "",
        Status: result.error ? "Failed" : "Success",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Product Catalog");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "product-catalog.xlsx");
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const zipFiles = acceptedFiles.filter(
        (file) => file.type === "application/zip"
      );
      const imageFiles = acceptedFiles.filter((file) =>
        file.type.startsWith("image/")
      );

      updateProcessingStage("validating");

      const validation = validateFiles.all(files, [...imageFiles, ...zipFiles]);
      if (!validation.valid) {
        setError(validation.error || "Invalid files");
        updateProcessingStage("idle");
        return;
      }

      updateProcessingStage("extracting");
      const processedFiles: File[] = [];

      for (const zipFile of zipFiles) {
        try {
          const extractedFiles = await processZipFile(zipFile, (files) => {
            return validateFiles.all(files, files).valid;
          });
          processedFiles.push(...extractedFiles);
        } catch (err) {
          setError("Failed to process ZIP file");
          updateProcessingStage("idle");
          return;
        }
      }

      setFiles((prev) => [...prev, ...imageFiles, ...processedFiles]);
      setError("");
      updateProcessingStage("idle");
    },
    [files]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: UPLOAD_CONFIG.ACCEPTED_TYPES,
    maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    disabled: isProcessing,
  });

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAllFiles = useCallback(() => {
    setFiles([]);
    setError("");
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0 && stage !== PROCESSING_STAGES.COMPLETED) {
      setError(ERROR_MESSAGES.NO_FILES);
      return;
    }

    if (stage === PROCESSING_STAGES.COMPLETED) {
      try {
        generateExcel(results);
        setTimeout(() => {
          updateProcessingStage(PROCESSING_STAGES.IDLE, 0);
          setFiles([]);
        }, 1000);
        return;
      } catch (err) {
        setError("Failed to download catalog");
        return;
      }
    }

    setIsProcessing(true);
    updateProcessingStage(PROCESSING_STAGES.UPLOADING, 0);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      abortControllerRef.current = new AbortController();

      updateProcessingStage(PROCESSING_STAGES.UPLOADING, 25);
      const response = await fetch(API_CONFIG.ENDPOINTS.PROCESS, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.UPLOAD_FAILED);
      }

      updateProcessingStage(PROCESSING_STAGES.PROCESSING, 50);
      const data = await response.json();

      setResults(data);

      updateProcessingStage(PROCESSING_STAGES.ANALYZING, 75);

      updateProcessingStage(PROCESSING_STAGES.COMPLETED, 100);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("Upload cancelled");
        } else {
          setError(ERROR_MESSAGES.PROCESSING_FAILED);
        }
      } else {
        setError(ERROR_MESSAGES.SERVER_ERROR);
      }
      updateProcessingStage(PROCESSING_STAGES.ERROR, 0);
    } finally {
      setIsProcessing(false);
    }
  }, [files, stage, results]);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      updateProcessingStage("idle");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          <Header />

          <Card>
            <CardContent className="p-8">
              <DropZone
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                isProcessing={isProcessing}
              />

              {error && <ErrorAlert message={error} />}

              {files.length > 0 && (
                <FileList
                  files={files}
                  onRemove={removeFile}
                  onRemoveAll={removeAllFiles}
                />
              )}

              {stage !== "idle" && (
                <ProcessingStatus
                  {...processingStats}
                  isProcessing={isProcessing}
                  stage={stage}
                  onCancel={cancelProcessing}
                />
              )}

              <UploadButton
                onClick={handleUpload}
                disabled={isProcessing || files.length === 0}
                isProcessing={isProcessing}
                stage={stage}
              />
            </CardContent>
          </Card>

          <Footer />
        </div>
      </main>
    </div>
  );
}
