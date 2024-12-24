// Recommended size limits
export const FILE_SIZE_LIMITS = {
    INDIVIDUAL_FILE: 2 * 1024 * 1024, // 2MB per file
    TOTAL_BATCH: 100 * 1024 * 1024,   // 100MB total
    MAX_FILES: 500
};

// File size formatter
export function formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
}