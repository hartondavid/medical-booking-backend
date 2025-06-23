import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";



const router = Router();


router.post('/addReview', userAuthMiddleware, async (req, res) => {

    try {

        const { rating, reservation_id } = req.body;
        const userId = req.user?.id;

        if (!rating) {
            return sendJsonResponse(res, false, 400, "Campurile sunt obligatorii!", []);
        }

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }


        const [id] = await db('reviews').insert({ rating, reservation_id, doctor_id: 1, pacient_id: userId });
        const review = await db('reviews').where({ id }).first();
        return sendJsonResponse(res, true, 201, "Rezervarea a fost adăugată cu succes!", { review });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la adăugarea rezervării!", { details: error.message });
    }
});

router.get('/getReviewsByDoctorId', userAuthMiddleware, async (req, res) => {
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

        const reviews = await db('reviews')
            .join('users', 'reviews.doctor_id', 'users.id')
            .join('reservations', 'reviews.reservation_id', 'reservations.id')
            .join('users as pacients', 'reservations.patient_id', 'pacients.id')
            .where('reviews.doctor_id', userId)
            .where('reservations.status', 'finished')
            .select(
                'reviews.id',
                'reviews.rating',
                'pacients.name',
                'pacients.photo',
                'pacients.phone',
                'pacients.email',
                'reservations.created_at',
                'reservations.subject',
                'reservations.description',

            )
            .orderBy('reviews.created_at', 'desc')
        if (reviews.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există recenzii!', []);
        }
        return sendJsonResponse(res, true, 200, 'Recenzii a fost găsite!', reviews);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea recenziilor!', { details: error.message });
    }
});

router.get('/getReservationsWithoutReviewsByPacientId', userAuthMiddleware, async (req, res) => {
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

        const reservations = await db('reservations')
            .leftJoin('reviews', 'reservations.id', 'reviews.reservation_id')
            .join('users', 'reservations.doctor_id', 'users.id')
            .where('reservations.patient_id', userId)
            .where('reviews.id', null)
            .where('reservations.status', 'finished')
            .select(
                'reservations.id',
                'users.name',
                'users.photo',
                'users.phone',
                'users.email',
                'reservations.created_at',
                'reservations.subject',
                'reservations.description',

            )
            .orderBy('reservations.created_at', 'desc')


        if (reservations.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rezervări fără recenzii!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rezervările cu recenzii a fost găsite!', reservations);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rezervărilor!', { details: error.message });
    }
});


export default router;
