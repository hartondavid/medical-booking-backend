import jwt from 'jsonwebtoken';
import db from '../database.mjs'; // Adjust the path as necessary


const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const userAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(422).json({ error: 'Missing Auth Token' });
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        const userId = decodedToken.id;

        // Fetch the user from the database based on the ID from the token
        const user = await db('users').where({ id: userId }).first();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Attach the user to the request object
        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        console.error(err);
        return res.status(422).json({ error: 'Invalid token' });
    }
};
