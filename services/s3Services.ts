import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

class S3Service {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        });
        this.bucketName = process.env.AWS_BUCKET_NAME!;
    }

    private generateKey(originalName: string): string {
        const randomString = Math.random().toString(36).substring(7);
        const nameToUse = originalName || 'unnamed';
        return `products/${randomString}-${nameToUse}-MAIN`;
    }

    async uploadFile(file: { buffer: Buffer; originalName: string; mimeType: string }): Promise<string> {
        const key = this.generateKey(file.originalName);

        try {
            const upload = new Upload({
                client: this.s3Client,
                params: {
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimeType,
                    CacheControl: 'max-age=31536000',
                    ContentDisposition: `inline; filename="${file.originalName}"`,
                    ServerSideEncryption: 'AES256',
                    Metadata: {
                        'original-name': file.originalName,
                        uploadTimestamp: Date.now().toString()
                    }
                },
                queueSize: 4,
                partSize: 5 * 1024 * 1024,
                leavePartsOnError: false
            });

            await upload.done();
            return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        } catch (error) {
            console.error(`Failed to upload ${file.originalName}:`, error);
            throw error;
        }
    }

    async deleteFile(key: string): Promise<void> {
        try {
            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key
                })
            );
        } catch (error) {
            console.error(`Failed to delete ${key}:`, error);
            throw error;
        }
    }

    async listFiles(prefix: string = 'catalogue/', maxKeys: number = 1000): Promise<string[]> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: prefix,
                MaxKeys: maxKeys
            });

            const response = await this.s3Client.send(command);
            return response.Contents?.map(obj => obj.Key!) || [];
        } catch (error) {
            console.error('Failed to list files:', error);
            throw error;
        }
    }

    async cleanupOldFiles(ageInDays: number = 7): Promise<void> {
        try {
            const files = await this.listFiles();
            const now = Date.now();
            const cutoffTime = now - (ageInDays * 24 * 60 * 60 * 1000);

            const oldFiles = files.filter(key => {
                const timestamp = parseInt(key.split('-')[1]);
                return timestamp < cutoffTime;
            });

            if (oldFiles.length > 0) {
                await Promise.all(oldFiles.map(key => this.deleteFile(key)));
            }
        } catch (error) {
            console.error('Failed to cleanup old files:', error);
            throw error;
        }
    }
}

export const s3Service = new S3Service();
