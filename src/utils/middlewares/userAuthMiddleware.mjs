import jwt from 'jsonwebtoken';
import databaseManager from '../database.mjs'; // Adjust the path as necessary

/** Must match the secret used in getAuthToken (utilFunctions) and login routes. */
function getJwtSecret() {
    return process.env.JWT_SECRET || 'your_jwt_secret';
}

/** Rejects empty, whitespace, and literal "null"/"undefined" from bad client storage */
function isUsableJwt(token) {
    if (!token || typeof token !== 'string') return false;
    const t = token.trim();
    if (!t || t === 'null' || t === 'undefined') return false;
    // JWT: header.payload.sig (three base64url segments)
    return t.split('.').length === 3;
}

export const userAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const tokenPreview =
        !token
            ? 'none'
            : token === 'null' || token === 'undefined'
              ? 'placeholder string from client (fix: omit Authorization or login)'
              : `${token.substring(0, 20)}...`;
    console.log('🔍 Auth middleware - Token received:', tokenPreview);
    console.log('🔍 Auth middleware - JWT_SECRET set in env:', Boolean(process.env.JWT_SECRET));

    if (!isUsableJwt(token)) {
        console.log('❌ Auth middleware - No valid token provided');
        return res.status(422).json({ error: 'Missing Auth Token' });
    }

    try {
        console.log('🔍 Auth middleware - Verifying token...');
        const decodedToken = jwt.verify(token, getJwtSecret());
        const userId = decodedToken.id;
        console.log('✅ Auth middleware - Token verified, user ID:', userId);

        // Fetch the user from the database based on the ID from the token
        console.log('🔍 Auth middleware - Fetching user from database...');

        const user = await (await databaseManager.getKnex())('users').where({ id: userId }).first();


        if (!user) {
            console.log('❌ Auth middleware - User not found in database for ID:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('✅ Auth middleware - User found:', { id: user.id, name: user.name, email: user.email });

        // Attach the user to the request object
        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        console.error('❌ Auth middleware - Token verification failed:', err.message);
        if (err.name === 'JsonWebTokenError' && err.message === 'invalid signature') {
            console.error(
                '🔍 Hint: token was signed with a different JWT_SECRET. Set JWT_SECRET in .env.local to match the backend that issued the token, or log in again against this server and use the new token.'
            );
        }
        console.error('🔍 Auth middleware - Error details:', err.stack);
        return res.status(422).json({ error: 'Invalid token' });
    }
};
