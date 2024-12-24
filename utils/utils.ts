// import { saveAs } from 'file-saver';
// import * as XLSX from 'xlsx';
// import { ProcessedImage } from '@/types/types';

// export const formatFileSize = (bytes: number): string => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
// };

// export const validateFiles = {
//     size: (file: File, maxSize: number): boolean => {
//         return file.size <= maxSize;
//     },

//     type: (file: File, acceptedTypes: string[]): boolean => {
//         return acceptedTypes.some(type => {
//             if (type.includes('*')) {
//                 const baseType = type.split('/')[0];
//                 return file.type.startsWith(`${baseType}/`);
//             }
//             return file.type === type;
//         });
//     },

//     all: (existingFiles: File[], newFiles: File[]): { valid: boolean; error?: string } => {
//         const totalFiles = existingFiles.length + newFiles.length;
//         if (totalFiles > 500) {
//             return {
//                 valid: false,
//                 error: 'Maximum number of files exceeded (500 files limit)'
//             };
//         }

//         const totalSize = [...existingFiles, ...newFiles].reduce((sum, file) => sum + file.size, 0);
//         if (totalSize > 100 * 1024 * 1024) {
//             return {
//                 valid: false,
//                 error: 'Total file size exceeded (100MB limit)'
//             };
//         }

//         return { valid: true };
//     }
// };

// export const downloadExcel = (results: ProcessedImage[], filename = 'product-catalog.xlsx') => {
//     const worksheet = XLSX.utils.json_to_sheet(
//         results.map(result => ({
//             'Image Name': result.imageName,
//             'Image URL': result.imageUrl || '',
//             'Description': result.description,
//             'Bullet Point 1': result.bulletPoints[0] || '',
//             'Bullet Point 2': result.bulletPoints[1] || '',
//             'Bullet Point 3': result.bulletPoints[2] || '',
//             'Bullet Point 4': result.bulletPoints[3] || '',
//             'Bullet Point 5': result.bulletPoints[4] || '',
//             'Processing Time (ms)': result.processingTime,
//             'Status': result.status,
//             'Error': result.error || ''
//         }))
//     );

//     const workbook = XLSX.utils.book_new();

//     // Set column widths
//     worksheet['!cols'] = [
//         { wch: 20 },  // Image Name
//         { wch: 50 },  // Image URL
//         { wch: 100 }, // Description
//         { wch: 50 },  // Bullet Point 1
//         { wch: 50 },  // Bullet Point 2
//         { wch: 50 },  // Bullet Point 3
//         { wch: 50 },  // Bullet Point 4
//         { wch: 50 },  // Bullet Point 5
//         { wch: 15 },  // Processing Time
//         { wch: 10 },  // Status
//         { wch: 30 },  // Error
//     ];

//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Catalog');
//     const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
//     const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//     saveAs(blob, filename);
// };

// export const processZipFile = async (
//     file: File,
//     validator: (files: File[]) => boolean
// ): Promise<File[]> => {
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = async (e) => {
//             try {
//                 const result = e.target?.result;
//                 if (!result || typeof result !== 'string') {
//                     throw new Error('Failed to read ZIP file');
//                 }

//                 // Convert base64 to Uint8Array
//                 const binaryString = atob(result.split(',')[1]);
//                 const bytes = new Uint8Array(binaryString.length);
//                 for (let i = 0; i < binaryString.length; i++) {
//                     bytes[i] = binaryString.charCodeAt(i);
//                 }

//                 const JSZip = (await import('jszip')).default;
//                 const zip = await JSZip.loadAsync(bytes);

//                 const extractedFiles: File[] = [];
//                 const promises: Promise<void>[] = [];

//                 zip.forEach((relativePath, zipEntry) => {
//                     if (!zipEntry.dir && /\.(jpg|jpeg|png)$/i.test(relativePath)) {
//                         const promise = zipEntry.async('blob').then(blob => {
//                             const extractedFile = new File([blob], relativePath, {
//                                 type: 'image/jpeg'
//                             });
//                             if (validateFiles.size(extractedFile, 2 * 1024 * 1024)) {
//                                 extractedFiles.push(extractedFile);
//                             }
//                         });
//                         promises.push(promise);
//                     }
//                 });

//                 await Promise.all(promises);

//                 if (validator(extractedFiles)) {
//                     resolve(extractedFiles);
//                 } else {
//                     reject(new Error('Extracted files validation failed'));
//                 }
//             } catch (error) {
//                 reject(error);
//             }
//         };
//         reader.onerror = () => reject(new Error('Failed to read ZIP file'));
//         reader.readAsDataURL(file);
//     });
// };

// export const createProgressTracker = (
//     onProgress: (progress: number) => void,
//     total: number
// ) => {
//     let processed = 0;

//     return {
//         increment: () => {
//             processed++;
//             const progress = (processed / total) * 100;
//             onProgress(progress);
//         },
//         getProgress: () => (processed / total) * 100,
//         getProcessed: () => processed
//     };
// };

// export const sleep = (ms: number): Promise<void> =>
//     new Promise(resolve => setTimeout(resolve, ms));

// export const retryWithBackoff = async <T>(
//     fn: () => Promise<T>,
//     maxRetries = 3,
//     baseDelay = 1000
// ): Promise<T> => {
//     let lastError: Error;

//     for (let attempt = 0; attempt < maxRetries; attempt++) {
//         try {
//             return await fn();
//         } catch (error) {
//             lastError = error as Error;
//             const delay = baseDelay * Math.pow(2, attempt);
//             await sleep(delay);
//         }
//     }

//     throw lastError!;
// };


import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { ProcessedImage } from '@/types/types';

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

    // Set column widths
    worksheet['!cols'] = [
        { wch: 20 },  // Image Name
        { wch: 50 },  // Image URL
        { wch: 100 }, // Description
        { wch: 50 },  // Bullet Point 1
        { wch: 50 },  // Bullet Point 2
        { wch: 50 },  // Bullet Point 3
        { wch: 50 },  // Bullet Point 4
        { wch: 50 },  // Bullet Point 5
        { wch: 15 },  // Processing Time
        { wch: 10 },  // Status
        { wch: 30 },  // Error
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Catalog');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
};

export const processZipFile = async (
    file: File,
    validator: (files: File[]) => boolean
): Promise<File[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const result = e.target?.result;
                if (!result || typeof result !== 'string') {
                    throw new Error('Failed to read ZIP file');
                }

                // Convert base64 to Uint8Array
                const binaryString = atob(result.split(',')[1]);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const JSZip = (await import('jszip')).default;
                const zip = await JSZip.loadAsync(bytes);

                const extractedFiles: File[] = [];
                const promises: Promise<void>[] = [];

                zip.forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir && /\.(jpg|jpeg|png)$/i.test(relativePath)) {
                        const promise = zipEntry.async('blob').then(blob => {
                            const extractedFile = new File([blob], relativePath, {
                                type: 'image/jpeg'
                            });
                            if (validateFiles.size(extractedFile, 2 * 1024 * 1024)) {
                                extractedFiles.push(extractedFile);
                            }
                        });
                        promises.push(promise);
                    }
                });

                await Promise.all(promises);

                if (validator(extractedFiles)) {
                    resolve(extractedFiles);
                } else {
                    reject(new Error('Extracted files validation failed'));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read ZIP file'));
        reader.readAsDataURL(file);
    });
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