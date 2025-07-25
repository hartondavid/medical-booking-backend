import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { put, del } from '@vercel/blob';

// Function to create multer storage with a dynamic destination
const createStorage = (uploadPath) => multer.diskStorage({
    destination: function (req, file, cb) {
        // Use /tmp directory for Vercel serverless environment
        const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
        const basePath = isVercel ? '/tmp' : process.cwd();
        const fullPath = path.join(basePath, uploadPath);

        try {
            // Create the folder if it doesn't exist
            fs.mkdirSync(fullPath, { recursive: true });
            console.log('Created upload directory:', fullPath);
            cb(null, fullPath);
        } catch (error) {
            console.error('Error creating upload directory:', error);
            // Fallback to /tmp if there's an error
            const fallbackPath = path.join('/tmp', path.basename(uploadPath));
            fs.mkdirSync(fallbackPath, { recursive: true });
            cb(null, fallbackPath);
        }
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

// Dynamic file filter function
const createFileFilter = (allowedMimeTypes) => (req, file, cb) => {
    console.log('File received in filter:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype
    });

    if (allowedMimeTypes.includes(file.mimetype)) {
        console.log('File type accepted:', file.mimetype);
        cb(null, true);
    } else {
        console.log('File type rejected:', file.mimetype);
        cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
};

// Function to return a multer instance with a dynamic destination and file type filter
const createMulter = (destinationPath, allowedMimeTypes) => {
    console.log('Creating multer instance with:', {
        destinationPath,
        allowedMimeTypes
    });

    // Use memory storage for Vercel Blob, disk storage for local development
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

    const storage = isProduction
        ? multer.memoryStorage() // For Vercel Blob - keeps file in memory
        : createStorage(destinationPath); // For local development - saves to disk

    return multer({
        storage: storage,
        fileFilter: createFileFilter(allowedMimeTypes),
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB limit
        }
    });
};

// Function to upload file to Vercel Blob (optional)
const uploadToBlob = async (file, filename) => {
    try {
        console.log('📤 Uploading to Vercel Blob:', filename);

        const blob = await put(filename, file, {
            access: 'public',
        });

        console.log('✅ Upload successful:', blob.url);
        return blob.url;
    } catch (error) {
        console.error('❌ Upload failed:', error);
        throw error;
    }
};

// Function to handle file upload from request (for Vercel Blob)
const handleFileUpload = async (req, res, next) => {
    try {
        if (!req.files || !req.files['photo']) {
            return res.status(400).json({ error: 'No photo file provided' });
        }

        const file = req.files['photo'][0];
        const filename = `cakes/${Date.now()}_${file.originalname}`;

        // Upload to Vercel Blob
        const imageUrl = await uploadToBlob(file.buffer, filename);

        // Add the URL to the request body
        req.body.photoUrl = imageUrl;

        next();
    } catch (error) {
        console.error('❌ File upload error:', error);
        return res.status(500).json({ error: 'File upload failed' });
    }
};

// Smart upload function that automatically chooses storage method based on environment
const smartUpload = async (file, folder = 'cakes') => {
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
    console.log('🔍 smartUpload - Environment detected:', {
        isProduction,
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV
    });

    if (isProduction) {
        // Use Vercel Blob in production
        console.log('🔍 smartUpload - Using Vercel Blob storage (production)');
        const filename = `${folder}/${Date.now()}_${file.originalname}`;

        try {
            // Check if we have the required environment variables
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                throw new Error('BLOB_READ_WRITE_TOKEN not configured');
            }

            console.log('🔍 smartUpload - Blob configuration:', {
                hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
                tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + '...',
                storeId: process.env.BLOB_STORE_ID || 'not configured'
            });

            console.log('🔍 smartUpload - File info:', {
                originalname: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                hasBuffer: !!file.buffer,
                hasPath: !!file.path
            });

            // In production, file should be in memory (buffer)
            if (!file.buffer) {
                throw new Error('File buffer not available for Vercel Blob upload');
            }

            const blob = await put(filename, file.buffer, {
                access: 'public',
                addRandomSuffix: false,
                // Optionally specify store ID if you have multiple stores
                ...(process.env.BLOB_STORE_ID && { storeId: process.env.BLOB_STORE_ID })
            });
            console.log('🔍 smartUpload - Vercel Blob upload successful:', blob.url);
            console.log('🔍 smartUpload - Blob details:', {
                url: blob.url,
                pathname: blob.pathname,
                size: blob.size,
                uploadedAt: blob.uploadedAt
            });
            return blob.url;
        } catch (blobError) {
            console.error('❌ smartUpload - Vercel Blob upload failed:', blobError);
            throw blobError; // Don't fallback in production, just fail
        }
    } else {
        // Use local storage in development
        console.log('🔍 smartUpload - Using local storage (development)');
        if (!file.path) {
            throw new Error('File path not available for local storage');
        }
        let filePathForImagePath = file.path;
        filePathForImagePath = filePathForImagePath.replace(/^public[\\/]/, '');
        console.log('🔍 smartUpload - Local file path processed:', filePathForImagePath);
        return filePathForImagePath;
    }
};

// Function to delete file from Vercel Blob
const deleteFromBlob = async (url) => {
    try {
        console.log('🗑️ Deleting from Vercel Blob:', url);

        if (!url || !url.includes('blob.vercel-storage.com')) {
            console.log('⚠️ Not a Vercel Blob URL, skipping deletion');
            return false;
        }

        await del(url);
        console.log('✅ File deleted from Vercel Blob successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to delete from Vercel Blob:', error);
        return false;
    }
};

export default createMulter;
export { uploadToBlob, handleFileUpload, smartUpload, deleteFromBlob };
