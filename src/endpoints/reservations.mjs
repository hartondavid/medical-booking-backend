import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";

const router = Router();

function toDatabaseDatetime(dateString) {
    // Keep clock time exactly as provided by UI (no UTC shift).
    const input = String(dateString || '').trim();
    const match = input.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?/);
    if (match) {
        const [, day, hour, minute] = match;
        return `${day} ${hour}:${minute}:00`;
    }
    // Fallback for unexpected input formats.
    const date = new Date(input);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** Programări doar la intervale de 30 min (grilă UTC — compatibil RO/Europa cu offset întreg). */
function isHalfHourSlot(dateString) {
    const input = String(dateString || '').trim();
    const match = input.match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return false;
    const minute = Number(match[2]);
    const second = match[3] ? Number(match[3]) : 0;
    return (minute === 0 || minute === 30) && second === 0;
}

const ACTIVE_STATUSES = ['pending', 'confirmed'];

// Adaugă o rezervare nouă
router.post('/addReservation', userAuthMiddleware, async (req, res) => {

    try {

        const { date, doctor_id, subject, description } = req.body;
        const userId = req.user?.id;
        const doctorId = Number(doctor_id);

        if (!date || !doctor_id || !subject || !description) {
            return sendJsonResponse(res, false, 400, "Campurile sunt obligatorii!", []);
        }

        if (!Number.isFinite(doctorId)) {
            return sendJsonResponse(res, false, 400, "doctor_id nu este valid!", []);
        }

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        if (!isHalfHourSlot(date)) {
            return sendJsonResponse(
                res,
                false,
                400,
                "Programările sunt disponibile din 30 în 30 de minute (ex. 10:00, 10:30).",
                []
            );
        }

        const dateStartMySQL = toDatabaseDatetime(date);

        const knex = await db.getKnex();

        // Același interval (medic + dată/oră exactă) nu poate fi rezervat de două ori (programări active)
        const slotTaken = await knex('reservations')
            .where({ doctor_id: doctorId })
            .whereRaw('date::timestamp = ?::timestamp', [dateStartMySQL])
            .whereIn('status', ACTIVE_STATUSES)
            .first();

        if (slotTaken) {
            return sendJsonResponse(
                res,
                false,
                409,
                "Acest interval este deja rezervat la acest medic. Alegeți altă oră.",
                []
            );
        }

        // PostgreSQL: insert() without .returning() is not iterable — use .returning('id')
        const [row] = await knex('reservations')
            .insert({ date: dateStartMySQL, doctor_id: doctorId, patient_id: userId, subject, description })
            .returning('id');
        const id = row && typeof row === 'object' ? row.id : row;
        const reservation = await knex('reservations').where({ id }).first();
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

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .orWhere('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservation = await (await db.getKnex())('reservations')
            .where({ id: reservationId }).first();

        if (!reservation) return sendJsonResponse(res, false, 404, "Rezervarea nu există!", []);
        await (await db.getKnex())('reservations').where({ id: reservationId }).update({
            status: status || reservation.status,
        });

        const updated = await (await db.getKnex())('reservations').where({ id: reservationId }).first();
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

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservation = await (await db.getKnex())('reservations')
            .where({ id: reservationId }).first();
        if (!reservation) return sendJsonResponse(res, false, 404, "Rezervarea nu există!", []);
        await (await db.getKnex())('reservations').where({ id: reservationId }).del();
        return sendJsonResponse(res, true, 200, "Rezervarea a fost ștearsă cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la ștergerea rezervării!", { details: error.message });
    }
});

router.get('/getReservationsByDoctorId', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservations = await (await db.getKnex())('reservations')
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

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservations = await (await db.getKnex())('reservations')
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

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservations = await (await db.getKnex())('reservations')
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

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const reservations = await (await db.getKnex())('reservations')
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