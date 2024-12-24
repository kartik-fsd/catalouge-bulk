// config.ts
export const PROCESSING_STAGES = {
    IDLE: 'idle',
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    ANALYZING: 'analyzing',
    GENERATING: 'generating',
    COMPLETED: 'completed',
    ERROR: 'error',
    VALIDATING: 'validating',
    EXTRACTING: 'extracting',
    PREPARING: 'preparing'
} as const;

export const UI_MESSAGES = {
    [PROCESSING_STAGES.IDLE]: '',
    [PROCESSING_STAGES.UPLOADING]: 'Uploading files...',
    [PROCESSING_STAGES.PROCESSING]: 'Processing your files...',
    [PROCESSING_STAGES.ANALYZING]: 'Analyzing images...',
    [PROCESSING_STAGES.GENERATING]: 'Generating catalog...',
    [PROCESSING_STAGES.COMPLETED]: 'Processing completed!',
    [PROCESSING_STAGES.ERROR]: 'Failed to process images. Please try again',
    [PROCESSING_STAGES.VALIDATING]: 'Validating files...',
    [PROCESSING_STAGES.EXTRACTING]: 'Extracting files...',
    [PROCESSING_STAGES.PREPARING]: 'Preparing files...',
    DOWNLOAD_READY: 'Your catalog is ready for download'
} as const;

export const UPLOAD_CONFIG = {
    MAX_FILES: 500,
    MAX_FILE_SIZE: 4 * 1024 * 1024, // 4MB
    MAX_TOTAL_SIZE: 400 * 1024 * 1024, // 400MB
    ACCEPTED_TYPES: {
        'image/*': ['.jpg', '.jpeg', '.png'],
        'application/zip': ['.zip']
    },
    BATCH_SIZE: 50,
    MAX_RETRIES: 3,
    RATE_LIMIT_DELAY: 1000 // 1 second
} as const;

export const API_CONFIG = {
    ENDPOINTS: {
        PROCESS: '/api/process-images'
    },
    TIMEOUTS: {
        DEFAULT: 30000, // 30 seconds
        UPLOAD: 60000  // 1 minute
    },
    HEADERS: {
        JSON: {
            'Content-Type': 'application/json'
        },
        MULTIPART: {}
    }
} as const;

export const ERROR_MESSAGES = {
    FILE_SIZE: 'File size exceeds the maximum limit of 2MB',
    TOTAL_SIZE: 'Total upload size exceeds the maximum limit of 100MB',
    FILE_COUNT: 'Maximum number of files (500) exceeded',
    INVALID_TYPE: 'Invalid file type. Please upload only images or ZIP files',
    UPLOAD_FAILED: 'Failed to upload files. Please try again',
    PROCESSING_FAILED: 'Failed to process images. Please try again',
    NO_FILES: 'Please select files to upload',
    NETWORK_ERROR: 'Network error. Please check your connection and try again',
    SERVER_ERROR: 'Server error occurred. Please try again later',
    ZIP_PROCESSING: 'Failed to process ZIP file',
} as const;