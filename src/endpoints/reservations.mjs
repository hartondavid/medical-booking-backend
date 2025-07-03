import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";

const router = Router();

function toMySQLDatetime(dateString) {
    // Converts ISO string to 'YYYY-MM-DD HH:MM:SS'
    const date = new Date(dateString);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}


// Adaugă o rezervare nouă
router.post('/addReservation', userAuthMiddleware, async (req, res) => {

    try {

        const { date, doctor_id, subject, description } = req.body;
        const userId = req.user?.id;

        if (!date || !doctor_id || !subject || !description) {
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
        const dateStartMySQL = toMySQLDatetime(date);

        const [id] = await db('reservations').insert({ date: dateStartMySQL, doctor_id, patient_id: userId, subject, description });
        const reservation = await db('reservations').where({ id }).first();
        return sendJsonResponse(res, true, 201, "Rezervarea a fost adăugată cu succes!", { reservation });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la adăugarea rezervării!", { details: error.message });
    }
});

// Actualizează o rezervare
router.put('/updateReservationStatus/:reservationId', userAuthMiddleware, async (req, res) => {

    try {
        const { reservationId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .orWhere('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservation = await db('reservations')
            .where({ id: reservationId }).first();

        if (!reservation) return sendJsonResponse(res, false, 404, "Rezervarea nu există!", []);
        await db('reservations').where({ id: reservationId }).update({
            status: status || reservation.status,
        });

        const updated = await db('reservations').where({ id: reservationId }).first();
        return sendJsonResponse(res, true, 200, "Rezervarea a fost actualizată cu succes!", { reservation: updated });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la actualizarea rezervării!", { details: error.message });
    }
});

// //Șterge o rezervare
router.delete('/deleteReservation/:reservationId', userAuthMiddleware, async (req, res) => {

    try {
        const { reservationId } = req.params;
        const userId = req.user?.id;

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservation = await db('reservations')
            .where({ id: reservationId }).first();
        if (!reservation) return sendJsonResponse(res, false, 404, "Rezervarea nu există!", []);
        await db('reservations').where({ id: reservationId }).del();
        return sendJsonResponse(res, true, 200, "Rezervarea a fost ștearsă cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la ștergerea rezervării!", { details: error.message });
    }
});

router.get('/getReservationsByDoctorId', userAuthMiddleware, async (req, res) => {
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

        const reservations = await db('reservations')
            .join('users', 'reservations.patient_id', 'users.id')
            .where('reservations.doctor_id', userId)
            .whereNot('reservations.status', 'finished')
            .select(
                'reservations.id',
                'reservations.date',
                'reservations.status',
                'reservations.updated_at',
                'users.name',
                'users.photo',
                'reservations.subject',
                'reservations.description',
                'users.phone',
                'users.email',
            )
            .orderBy('reservations.updated_at', 'desc')
        if (reservations.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rezervări!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rezervări a fost găsite!', reservations);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rezervărilor!', { details: error.message });
    }
});

router.get('/getReservationsByPatientId', userAuthMiddleware, async (req, res) => {
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
            .join('users', 'reservations.doctor_id', 'users.id')
            .where('reservations.patient_id', userId)
            .whereNot('reservations.status', 'finished')
            .select(
                'reservations.id',
                'reservations.date',
                'reservations.status',
                'reservations.updated_at',
                'users.name as name',
                'users.photo as photo',
                'reservations.subject',
                'reservations.description',
                'users.phone',
                'users.email',
            )
            .orderBy('reservations.updated_at', 'desc')
        if (reservations.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rezervări!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rezervări a fost găsite!', reservations);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rezervărilor!', { details: error.message });
    }
});

router.get('/getPastReservationsByDoctorId', userAuthMiddleware, async (req, res) => {
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

        const reservations = await db('reservations')
            .join('users', 'reservations.patient_id', 'users.id')
            .where('reservations.doctor_id', userId)
            .where('reservations.status', 'finished')
            .select(
                'reservations.id',
                'reservations.date',
                'reservations.status',
                'reservations.updated_at',
                'users.name',
                'users.phone',
                'users.email',
                'users.photo',
                'reservations.subject',
                'reservations.description',
            )
            .orderBy('reservations.updated_at', 'desc')
        if (reservations.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rezervări!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rezervări a fost găsite!', reservations);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rezervărilor!', { details: error.message });
    }
});

router.get('/getPastReservationsByPatientId', userAuthMiddleware, async (req, res) => {
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
            .join('users', 'reservations.doctor_id', 'users.id')
            .where('reservations.patient_id', userId)
            .where('reservations.status', 'finished')
            .select(
                'reservations.id',
                'reservations.date',
                'reservations.status',
                'reservations.updated_at',
                'users.name',
                'users.phone',
                'users.email',
                'users.photo',
                'reservations.subject',
                'reservations.description',
            )
            .orderBy('reservations.updated_at', 'desc')
        if (reservations.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rezervări!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rezervări a fost găsite!', reservations);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rezervărilor!', { details: error.message });
    }
});



export default router; 