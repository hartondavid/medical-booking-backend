import jwt from 'jsonwebtoken';
import databaseManager from '../database.mjs'; // Adjust the path as necessary


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const userAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Auth middleware - Token received:', token ? token.substring(0, 20) + '...' : 'none');
    console.log('🔍 Auth middleware - JWT_SECRET configured:', JWT_SECRET !== 'your_jwt_secret');

    if (!token) {
        console.log('❌ Auth middleware - No token provided');
        return res.status(422).json({ error: 'Missing Auth Token' });
    }

    try {
        console.log('🔍 Auth middleware - Verifying token...');
        const decodedToken = jwt.verify(token, JWT_SECRET);
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
        console.error('🔍 Auth middleware - Error details:', err.stack);
        return res.status(422).json({ error: 'Invalid token' });
    }
};
