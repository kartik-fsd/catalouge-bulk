import { UploadState } from '@/types/types';
import { useState, useCallback, useEffect } from 'react';


export function useWindowFocus() {
    const [isFocused, setIsFocused] = useState(true);

    useEffect(() => {
        const onFocus = () => setIsFocused(true);
        const onBlur = () => setIsFocused(false);

        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
        };
    }, []);

    return isFocused;
}

export function useFileUpload() {
    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        progress: 0,
        error: null,
    });

    const startUpload = useCallback(() => {
        setUploadState({
            isUploading: true,
            progress: 0,
            error: null,
        });
    }, []);

    const updateProgress = useCallback((progress: number) => {
        setUploadState(prev => ({
            ...prev,
            progress,
        }));
    }, []);

    const handleError = useCallback((error: string) => {
        setUploadState({
            isUploading: false,
            progress: 0,
            error,
        });
    }, []);

    const resetUpload = useCallback(() => {
        setUploadState({
            isUploading: false,
            progress: 0,
            error: null,
        });
    }, []);

    return {
        uploadState,
        startUpload,
        updateProgress,
        handleError,
        resetUpload,
    };
}