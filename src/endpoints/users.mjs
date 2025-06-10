import { Router } from "express";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";

import { getAuthToken, md5Hash, sendJsonResponse } from "../utils/utilFunctions.mjs";
import db from "../utils/database.mjs";

const router = Router();

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate request
        if (!email || !password) {
            return sendJsonResponse(res, false, 400, "Email and password are required", []);
        }
        // Fetch user from database
        const user = await db('users').where({ email }).first();

        if (!user) {
            return sendJsonResponse(res, false, 401, "Invalid credentials", []);
        }

        // Compare passwords (hashed with MD5)
        const hashedPassword = md5Hash(password);

        if (hashedPassword !== user.password) {
            return sendJsonResponse(res, false, 401, "Invalid credentials", []);
        }

        // Generate JWT token
        const token = getAuthToken(user.id, user.email, false, '1d', true)

        await db('users')
            .where({ id: user.id })
            .update({ last_login: parseInt(Date.now() / 1000) });

        // Set custom header
        res.set('X-Auth-Token', token);

        return sendJsonResponse(res, true, 200, "Successfully logged in!", { user });
    } catch (error) {
        console.error("Login error:", error);
        return sendJsonResponse(res, false, 500, "Internal server error", []);
    }
});


router.get('/checkLogin', userAuthMiddleware, async (req, res) => {
    return sendJsonResponse(res, true, 200, "User is logged in", req.user);
})


router.get('/getDoctors', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const doctors = await db('users')
            .join('user_rights', 'users.id', 'user_rights.user_id')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .select(
                'users.id',
                'users.name',
                'users.email',
                'users.phone',
                'users.photo',
                'users.specialization',
            )

        if (doctors.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există doctori!', []);
        }
        return sendJsonResponse(res, true, 200, 'Doctori a fost găsiți!', doctors);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea doctorilor!', { details: error.message });
    }
});

router.get('/getPatients', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const pacients = await db('users')
            .join('user_rights', 'users.id', 'user_rights.user_id')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)

            .select(
                'users.id',
                'users.name',
                'users.email',
                'users.phone',
                'users.photo',
            )

        if (pacients.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există pacienți!', []);
        }
        return sendJsonResponse(res, true, 200, 'Pacienții a fost găsiți!', pacients);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea pacienților!', { details: error.message });
    }
});

export default router;





