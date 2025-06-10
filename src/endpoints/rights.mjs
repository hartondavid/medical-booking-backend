import { Router } from "express";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";

const router = Router();

router.get('/getUserRights', userAuthMiddleware, async (req, res) => {
    try {
        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where({ user_id: req.user.id })
            .select(
                'user_rights.*',
                'rights.name',
                'rights.right_code'

            );

        console.log('userRights', userRights);


        if (!userRights) {
            req.userRights = [];
            return sendJsonResponse(res, false, 404, 'User rights not found', []);
        }

        return sendJsonResponse(res, true, 200, "User rights fetched successfully", userRights);
    } catch (err) {
        console.error(err);
        return sendJsonResponse(res, false, 422, 'Internal server error', []);
    }
})




export default router;