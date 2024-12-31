import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import AdmZip from 'adm-zip';
import retry from 'async-retry';
import { s3Service } from '@/services/s3Services';


// Define all types at the top
type ProcessingStatus = 'processing' | 'completed' | 'failed';

interface ProcessedImage {
    imageName: string;
    productName: string;
    description: string;
    features: string[];
    dimensions: string;
    materials: string;
    imageUrl: string;
    processingTime: number;
    status: ProcessingStatus;
    error?: string;
}

interface FileToProcess {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}



interface ProductDetails {
    productName: string;
    description: string;
    features: string[];
    dimensions: string;
    materials: string;
    categories: string[];
}

// Configuration with proper types
const CONFIG = {
    LIMITS: {
        MAX_RETRIES: 3,
        BATCH_SIZE: 100,
        CONCURRENT_REQUESTS: 20,
        MAX_FILE_SIZE: 8 * 1024 * 1024, // 8MB
        MAX_TOTAL_SIZE: 400 * 1024 * 1024, // 400MB
        MAX_FILES: 500,
        RATE_LIMIT_DELAY: 60,
    }
} as const;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Utility function to validate file type
function isValidImageType(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(mimeType);
}

// Form data validation function
async function validateAndProcessFormData(formData: FormData): Promise<FileToProcess[]> {
    const files: FileToProcess[] = [];
    let totalSize = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, value] of formData.entries()) {
        if (value instanceof Blob) {
            const buffer = Buffer.from(await value.arrayBuffer());

            if (buffer.length > CONFIG.LIMITS.MAX_FILE_SIZE) {
                continue;
            }

            totalSize += buffer.length;
            if (totalSize > CONFIG.LIMITS.MAX_TOTAL_SIZE) {
                throw new Error(`Total size exceeds ${CONFIG.LIMITS.MAX_TOTAL_SIZE} bytes limit`);
            }

            if (!isValidImageType(value.type)) {
                continue;
            }

            if (value.type === 'application/zip') {
                const zip = new AdmZip(buffer);
                for (const entry of zip.getEntries()) {
                    if (entry.entryName.match(/\.(jpg|jpeg|png)$/i)) {
                        const imageBuffer = entry.getData();
                        if (imageBuffer.length <= CONFIG.LIMITS.MAX_FILE_SIZE) {
                            files.push({
                                buffer: imageBuffer,
                                fileName: entry.entryName,
                                mimeType: 'image/jpeg'
                            });
                        }
                    }
                }
            } else if (isValidImageType(value.type)) {
                files.push({
                    buffer,
                    fileName: `image-${Date.now()}-${files.length}.jpg`,
                    mimeType: value.type
                });
            }
        }
    }

    return files;
}

// Generate product details with proper type safety
async function generateProductDetails(imageBuffer: Buffer): Promise<ProductDetails> {
    return retry(
        async () => {
            const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4-turbo-2024-04-09',
                messages: [
                    {
                        role: 'system',
                        content: `Analyze product images and provide structured details in the following format ONLY:
                            Product Name: [name]
                            Description: [brief description]
                            Features:
                            - [feature 1]
                            - [feature 2]
                            - [feature 3]
                            Dimensions: [dimensions]
                            Materials: [materials]
                            Categories:
                            - [primary category]
                            - [secondary category]

                            Note:
                            - The "Categories" field must include two relevant product categories. For example: Furniture, Home Decor, Kitchen, Outdoor, Lighting, etc.
                            - If no specific category applies, use general terms based on the image.
                            `
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this product image with the specified format.' },
                            {
                                type: 'image_url',
                                image_url: { url: base64Image, detail: 'high' }
                            }
                        ]
                    }
                ],
                max_tokens: 400,
                temperature: 0.2,
            });

            const response = completion.choices[0].message?.content || '';

            const productName = response.match(/Product Name: (.+?)(?=\n|$)/)?.[1] || 'Product name pending';
            const description = response.match(/Description: (.+?)(?=\n|$)/)?.[1] || 'Description pending';
            const featuresMatch = response.match(/Features:\n((?:- .+\n?)+)/);
            const features = featuresMatch
                ? featuresMatch[1].split('\n').filter(f => f.startsWith('- ')).map(f => f.substring(2))
                : Array(3).fill('Feature pending');
            const dimensions = response.match(/Dimensions: (.+?)(?=\n|$)/)?.[1] || 'Dimensions pending';
            const materials = response.match(/Materials: (.+?)(?=\n|$)/)?.[1] || 'Materials pending';
            const categoriesMatch = response.match(/Categories: (.+?)(?=\n|$)/)?.[1] || '';
            const categories = categoriesMatch
                ? categoriesMatch.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0)
                : ['Category pending'];

            return {
                productName,
                description,
                features: features.slice(0, 3),
                dimensions,
                materials,
                categories
            };
        },
        {
            retries: CONFIG.LIMITS.MAX_RETRIES,
            factor: 1.5,
            minTimeout: 2000,
            maxTimeout: 10000,
            onRetry: (error: Error) => {
                console.warn('Retrying OpenAI request:', error.message);
            }
        }
    );
}

// Process images with proper type handling
async function processImageBatch(files: FileToProcess[]): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = [];
    const chunks = Array.from({ length: Math.ceil(files.length / CONFIG.LIMITS.CONCURRENT_REQUESTS) },
        (_, i) => files.slice(i * CONFIG.LIMITS.CONCURRENT_REQUESTS, (i + 1) * CONFIG.LIMITS.CONCURRENT_REQUESTS)
    );

    for (const chunk of chunks) {
        const chunkStartTime = Date.now();
        const chunkResults = await Promise.all(
            chunk.map(async (file): Promise<ProcessedImage> => {
                try {
                    const [imageUrl, details] = await Promise.all([
                        s3Service.uploadFile({ buffer: file.buffer, originalName: file.fileName, mimeType: file.mimeType }),
                        generateProductDetails(file.buffer)
                    ]);

                    return {
                        imageName: file.fileName,
                        ...details,
                        imageUrl,
                        processingTime: Date.now() - chunkStartTime,
                        status: 'completed'
                    };
                } catch (error) {
                    return {
                        imageName: file.fileName,
                        productName: 'Processing failed',
                        description: 'Failed to process image',
                        features: Array(3).fill('Processing error'),
                        dimensions: 'Processing error',
                        materials: 'Processing error',
                        imageUrl: '',
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        processingTime: Date.now() - chunkStartTime,
                        status: 'failed'
                    };
                }
            })
        );

        results.push(...chunkResults);

        if (chunks.indexOf(chunk) < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.LIMITS.RATE_LIMIT_DELAY));
        }
    }

    return results;
}

// Main route handler with proper response typing
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const files = await validateAndProcessFormData(formData);

        if (files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid images found in the upload.' },
                { status: 400 }
            );
        }

        if (files.length > CONFIG.LIMITS.MAX_FILES) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Too many images. Maximum ${CONFIG.LIMITS.MAX_FILES} images allowed.`
                },
                { status: 400 }
            );
        }

        const batches = Array.from({ length: Math.ceil(files.length / CONFIG.LIMITS.BATCH_SIZE) },
            (_, i) => files.slice(i * CONFIG.LIMITS.BATCH_SIZE, (i + 1) * CONFIG.LIMITS.BATCH_SIZE)
        );

        const results: ProcessedImage[] = [];
        for (const batch of batches) {
            const batchResults = await processImageBatch(batch);
            results.push(...batchResults);
        }

        return NextResponse.json({
            success: true,
            total: results.length,
            completed: results.filter(r => r.status === 'completed').length,
            failed: results.filter(r => r.status === 'failed').length,
            data: results
        });
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process images',
                details: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
