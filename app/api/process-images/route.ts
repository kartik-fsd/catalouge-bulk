import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';
import OpenAI from 'openai';
import AdmZip from 'adm-zip';
import retry from 'async-retry';
import { OpenAIError } from '@/types/types';

// Configuration
const CONFIG = {
    LIMITS: {
        MAX_RETRIES: 3,
        BATCH_SIZE: 50,
        CONCURRENT_REQUESTS: 5,
        MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
        MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB
        MAX_FILES: 500,
    }
};

// Types
interface ProcessedImage {
    imageName: string;
    description: string;
    bulletPoints: string[];
    error?: string;
    imageUrl?: string;
    processingTime: number;
    status: 'processing' | 'completed' | 'failed';
}

interface FileToProcess {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}

// Initialize services
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Core processing functions
async function uploadToImageKit(file: Buffer, fileName: string): Promise<string> {
    return retry(
        async () => {
            const response = await imagekit.upload({
                file: file.toString('base64'),
                fileName,
                folder: '/product-images',
                useUniqueFileName: true,
                tags: ['product-catalog'],
                responseFields: ['url', 'fileId', 'tags'],
            });
            return response.url;
        },
        {
            retries: CONFIG.LIMITS.MAX_RETRIES,
            factor: 2,
            minTimeout: 1000,
            maxTimeout: 5000,
            onRetry: (error) => {
                console.warn(`Retry uploading ${fileName}:`, error);
            }
        }
    );
}

async function generateDescription(imageBuffer: Buffer): Promise<{
    description: string;
    bulletPoints: string[];
}> {
    return retry(
        async () => {
            try {
                const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4-turbo-2024-04-09',
                    messages: [
                        {
                            role: 'system',
                            content: `Analyze product descriptions or images. Provide:
                                    Product Name, Description, Key Features,
                                      Dimensions, Materials.`,
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Analyze this product image and provide the required details.'
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: base64Image,
                                        detail: 'high'
                                    }
                                }
                            ]
                        },
                    ],
                    max_tokens: 400,
                    temperature: 0.2,
                });

                const response = completion.choices[0].message?.content || '';
                console.log('OpenAI Response:', response);

                let description = '';
                let bulletPoints: string[] = [];

                const descriptionMatch = response.match(/Description:?\s*([\s\S]+?)(?=\n\n|\n?Bullet Points:|$)/i);
                if (descriptionMatch) {
                    description = descriptionMatch[1]
                        .trim()
                        .replace(/\n+/g, ' ')
                        .replace(/\s{2,}/g, ' ');
                }

                const bulletPointsSection = response.match(/Bullet Points:?\s*([\s\S]+)$/i);
                if (bulletPointsSection) {
                    bulletPoints = bulletPointsSection[1]
                        .split('\n')
                        .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
                        .filter(line => line.length > 0 && !line.toLowerCase().includes('bullet points'));
                }

                // Fallback processing
                if (!description || bulletPoints.length === 0) {
                    if (!description) {
                        description = response.replace(/Bullet Points:?[\s\S]*$/, '').trim();
                    }

                    if (bulletPoints.length === 0) {
                        const technicalDetails = response
                            .split(/[.!?]+/)
                            .map(s => s.trim())
                            .filter(s =>
                                s.length > 0 &&
                                !s.toLowerCase().includes('bullet point') &&
                                !s.toLowerCase().startsWith('description'));

                        bulletPoints = technicalDetails
                            .slice(0, 5)
                            .map(detail => detail.replace(/^[•\-\*]\s*/, ''));
                    }
                }

                // Fill remaining bullet points if needed
                while (bulletPoints.length < 5) {
                    const defaultPoints = [
                        'Material composition analysis pending',
                        'Dimensional specifications to be verified',
                        'Additional feature specifications pending',
                        'Detailed surface characteristics pending',
                        'Further technical details pending'
                    ];
                    bulletPoints.push(defaultPoints[bulletPoints.length]);
                }

                return {
                    description: description || 'Technical product analysis pending',
                    bulletPoints: bulletPoints.slice(0, 5)
                };
            } catch (error) {
                const openAIError = error as OpenAIError;

                if (openAIError.status === 429) {
                    const retryAfter = parseInt(openAIError.headers?.['retry-after'] || '15');
                    console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    throw error;
                }

                console.error('OpenAI API Error:', JSON.stringify(openAIError, null, 2));
                throw error;
            }
        },
        {
            retries: CONFIG.LIMITS.MAX_RETRIES,
            factor: 2,
            minTimeout: 2000,
            maxTimeout: 10000,
            onRetry: (error: Error, attemptNumber: number) => {
                console.warn(`Retry attempt ${attemptNumber} due to error:`, error.message);
            }
        }
    );
}



async function processImage(file: FileToProcess): Promise<ProcessedImage> {
    const startTime = Date.now();
    try {
        // Upload to ImageKit
        const imageUrl = await uploadToImageKit(file.buffer, file.fileName);

        // Generate description using OpenAI
        const { description, bulletPoints } = await generateDescription(file.buffer);

        return {
            imageName: file.fileName,
            description,
            bulletPoints,
            imageUrl,
            processingTime: Date.now() - startTime,
            status: 'completed'
        };
    } catch (error) {
        console.error(`Error processing ${file.fileName}:`, error);
        return {
            imageName: file.fileName,
            description: 'Failed to process image',
            bulletPoints: Array(5).fill('Processing error'),
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            processingTime: Date.now() - startTime,
            status: 'failed'
        };
    }
}

async function processBatch(
    images: FileToProcess[],
    startIdx: number,
    totalImages: number
): Promise<ProcessedImage[]> {
    console.log(`Processing batch starting at index ${startIdx} of ${totalImages} total images`);

    const results: ProcessedImage[] = [];
    for (const file of images) {
        try {
            const result = await processImage(file);
            results.push(result);
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error(`Error processing ${file.fileName}:`, errorMessage);
            results.push({
                imageName: file.fileName,
                description: 'Failed to process image',
                bulletPoints: Array(5).fill('Processing error'),
                error: errorMessage,
                processingTime: 0,
                status: 'failed'
            });
        }
    }
    return results;
}

async function validateAndProcessFormData(formData: FormData): Promise<FileToProcess[]> {
    const files: FileToProcess[] = [];
    let totalSize = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, value] of formData.entries()) {
        if (value instanceof Blob) {
            const buffer = Buffer.from(await value.arrayBuffer());

            if (buffer.length > CONFIG.LIMITS.MAX_FILE_SIZE) {
                console.warn(`Skipping file: exceeds size limit of ${CONFIG.LIMITS.MAX_FILE_SIZE} bytes`);
                continue;
            }

            totalSize += buffer.length;
            if (totalSize > CONFIG.LIMITS.MAX_TOTAL_SIZE) {
                throw new Error(`Total size exceeds ${CONFIG.LIMITS.MAX_TOTAL_SIZE} bytes limit`);
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
            } else if (value.type.startsWith('image/')) {
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

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = await validateAndProcessFormData(formData);

        if (files.length === 0) {
            return NextResponse.json(
                { error: 'No valid images found in the upload.' },
                { status: 400 }
            );
        }

        if (files.length > CONFIG.LIMITS.MAX_FILES) {
            return NextResponse.json(
                { error: `Too many images. Maximum ${CONFIG.LIMITS.MAX_FILES} images allowed.` },
                { status: 400 }
            );
        }

        const results: ProcessedImage[] = [];
        for (let i = 0; i < files.length; i += CONFIG.LIMITS.BATCH_SIZE) {
            const batch = files.slice(i, i + CONFIG.LIMITS.BATCH_SIZE);
            const batchResults = await processBatch(batch, i, files.length);
            results.push(...batchResults);
        }

        // Return JSON results for client-side Excel generation
        return NextResponse.json(results);
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            {
                error: 'Failed to process images',
                details: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}