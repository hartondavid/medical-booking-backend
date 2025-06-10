import multer from 'multer';
import path from 'path';

function createMulter(destination, allowedMimeTypes) {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, destination);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    });

    const fileFilter = function (req, file, cb) {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    };

    return multer({ storage, fileFilter });
}

export default createMulter; 