import sharp from 'sharp';

export async function compressImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .resize(1600, 1600, { // Max dimensions 1600x1600
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({
            quality: 80,        // 80% quality
            progressive: true,
            mozjpeg: true      // Use mozjpeg compression
        })
        .toBuffer();
}