/* eslint-disable @typescript-eslint/no-explicit-any */


export interface FileToProcess {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}

export interface ProcessedImage {
    status: any;
    imageName: string;
    description: string;
    bulletPoints: string[];
    error?: string;
    imageUrl?: string;
    processingTime: number;
}



export interface DropZoneProps {
    getRootProps: () => any;
    getInputProps: () => any;
    isDragActive: boolean;
    isProcessing: boolean;
}

export interface FileItemProps {
    file: File;
    onRemove: () => void;
}

export interface FileListProps {
    files: File[];
    onRemove: (index: number) => void;
    onRemoveAll: () => void;
}



export interface OpenAIError extends Error {
    status?: number;
    headers?: {
        'retry-after'?: string;
    };
}

export interface UploadState {
    isUploading: boolean;
    progress: number;
    error: string | null;
}

export interface StatusItemProps {
    icon: React.FC<any>;
    value: number;
    label: string;
    color: string;
}

export interface FileToProcess {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}

export interface ProcessedImage {
    status: any;
    imageName: string;
    description: string;
    bulletPoints: string[];
    error?: string;
    imageUrl?: string;
    processingTime: number;
}

export interface FileToProcess {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}



export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
        type: 'text';
        text: string;
    }>;
}


export interface ChatMessageContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'high' | 'low' | 'auto';
    };
}


export type ProcessingStage =
    | 'idle'
    | 'uploading'
    | 'processing'
    | 'analyzing'
    | 'generating'
    | 'completed'
    | 'error'
    | 'validating'
    | 'extracting'
    | 'preparing';


export interface ProcessingStats {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    stage: ProcessingStage;
    progress: number;
}

export interface ProcessingStatusProps extends ProcessingStats {
    isProcessing: boolean;
    stage: ProcessingStage;
    onCancel?: () => void;
}

export interface ProcessedResult {
    imageName: string;
    description: string;
    bulletPoints: string[];
    error?: string;
    imageUrl?: string;
    processingTime: number;
}

export interface UploadButtonProps {
    onClick: () => void;
    disabled: boolean;
    isProcessing: boolean;
    stage: ProcessingStage;
}