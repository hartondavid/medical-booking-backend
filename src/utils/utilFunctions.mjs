import crypto from 'crypto'
import jwt from 'jsonwebtoken';

export function generateHashedApiKey() {
    return generateApiKey();
}

export function getAuthToken(userId, userPhone, guest, expire, employee = true) {
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    return jwt.sign({ id: userId, phone: userPhone, guest: guest, employee: employee }, JWT_SECRET, { expiresIn: expire });
}

export function md5Hash(password) { return crypto.createHash('md5').update(password + password).digest('hex') }

export function sendJsonResponse(res, success, status, message, data) {
    res.status(status).json({ success: success, message: message, data: data });
}

