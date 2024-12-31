import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { ProcessedImage } from '@/types/types';
import { UPLOAD_CONFIG } from './config';
import JSZip from 'jszip';

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const validateFiles = {
    size: (file: File, maxSize: number): boolean => {
        return file.size <= maxSize;
    },

    type: (file: File, acceptedTypes: string[]): boolean => {
        return acceptedTypes.some(type => {
            if (type.includes('*')) {
                const baseType = type.split('/')[0];
                return file.type.startsWith(`${baseType}/`);
            }
            return file.type === type;
        });
    },

    all: (existingFiles: File[], newFiles: File[]): { valid: boolean; error?: string } => {
        const totalFiles = existingFiles.length + newFiles.length;
        if (totalFiles > 500) {
            return {
                valid: false,
                error: 'Maximum number of files exceeded (500 files limit)'
            };
        }

        const totalSize = [...existingFiles, ...newFiles].reduce((sum, file) => sum + file.size, 0);
        if (totalSize > 100 * 1024 * 1024) {
            return {
                valid: false,
                error: 'Total file size exceeded (100MB limit)'
            };
        }

        return { valid: true };
    }
};

export const downloadExcel = (results: ProcessedImage[], filename = 'product-catalog.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(
        results.map(result => ({
            'Image Name': result.imageName,
            'Image URL': result.imageUrl || '',
            'Description': result.description,
            'Bullet Point 1': result.bulletPoints[0] || '',
            'Bullet Point 2': result.bulletPoints[1] || '',
            'Bullet Point 3': result.bulletPoints[2] || '',
            'Bullet Point 4': result.bulletPoints[3] || '',
            'Bullet Point 5': result.bulletPoints[4] || '',
            'Processing Time (ms)': result.processingTime,
            'Status': result.status,
            'Error': result.error || ''
        }))
    );

    const workbook = XLSX.utils.book_new();

    worksheet['!cols'] = [
        { wch: 20 },
        { wch: 50 },
        { wch: 100 },
        { wch: 50 },
        { wch: 50 },
        { wch: 50 },
        { wch: 50 },
        { wch: 50 },
        { wch: 15 },
        { wch: 10 },
        { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Catalog');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
};

export const processZipFile = async (
    zipFile: File,
    validateFn: (files: File[]) => boolean
): Promise<File[]> => {
    const zip = new JSZip();

    try {
        const zipContent = await zip.loadAsync(zipFile);
        const extractedFiles: File[] = [];

        for (const [filename, file] of Object.entries(zipContent.files)) {
            if (file.dir || filename.startsWith('__MACOSX/') || filename.startsWith('.')) {
                continue;
            }

            const isAcceptedType = UPLOAD_CONFIG.ACCEPTED_TYPES['image/*']
                .some(ext => filename.toLowerCase().endsWith(ext.substring(1)));

            if (!isAcceptedType) {
                continue;
            }

            const blob = await file.async('blob');
            const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
            const mimeType = getMimeType(fileExtension);

            if (mimeType) {
                const extractedFile = new File(
                    [blob],
                    filename.split('/').pop() || filename,
                    { type: mimeType }
                );

                if (extractedFile.size <= UPLOAD_CONFIG.MAX_FILE_SIZE) {
                    extractedFiles.push(extractedFile);
                }
            }
        }

        if (extractedFiles.length > UPLOAD_CONFIG.MAX_FILES) {
            throw new Error(`ZIP contains more than ${UPLOAD_CONFIG.MAX_FILES} files`);
        }

        if (validateFn && !validateFn(extractedFiles)) {
            throw new Error('Extracted files failed validation');
        }

        return extractedFiles;

    } catch (error) {
        console.error('Error processing ZIP file:', error);
        throw error;
    }
};

const getMimeType = (extension: string): string | null => {
    const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    };

    return mimeTypes[extension] || null;
};

export const createProgressTracker = (
    onProgress: (progress: number) => void,
    total: number
) => {
    let processed = 0;

    return {
        increment: () => {
            processed++;
            const progress = (processed / total) * 100;
            onProgress(progress);
        },
        getProgress: () => (processed / total) * 100,
        getProcessed: () => processed
    };
};

export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

export const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const delay = baseDelay * Math.pow(2, attempt);
            await sleep(delay);
        }
    }

    throw lastError!;
};
