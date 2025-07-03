import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";
import createMulter from "../utils/uploadUtils.mjs";

const upload = createMulter('public/uploads/prescriptions', [
    'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip', 'application/x-rar-compressed', 'application/octet-stream'
]);

const router = Router();


// Adaugă o rețetă nouă 
router.post('/addPrescription', userAuthMiddleware, upload.fields([{ name: 'file' }]), async (req, res) => {

    try {
        const userId = req.user?.id;
        const { patient_id } = req.body;

        if (!patient_id) {
            return sendJsonResponse(res, false, 400, "Pacientul nu există!", []);
        }

        if (!req.files || !req.files['file']) {
            return sendJsonResponse(res, false, 400, "File is required", null);
        }

        let filePathForImagePath = req.files['file'][0].path; // Get the full file path
        filePathForImagePath = filePathForImagePath.replace(/^public[\\/]/, '');

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const [id] = await db('prescriptions').insert({ file_path: filePathForImagePath, patient_id: patient_id, doctor_id: userId });

        const prescription = await db('prescriptions').where({ id }).first();
        return sendJsonResponse(res, true, 201, "Reteta a fost adăugată cu succes!", { prescription });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la adăugarea retetei!", { details: error.message });
    }
});

// Actualizează o rețetă
router.put('/updatePrescription/:prescriptionId', userAuthMiddleware, async (req, res) => {

    try {
        const { prescriptionId } = req.params;
        const { file_path } = req.body;
        const userId = req.user?.id;

        if (!prescriptionId) {
            return sendJsonResponse(res, false, 400, "Reteta nu există!", []);
        }

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const prescription = await db('prescriptions')
            .where({ id: prescriptionId }).first();

        if (!prescription) return sendJsonResponse(res, false, 404, "Reteta nu există!", []);
        await db('prescriptions').where({ id: prescriptionId }).update({
            file_path: file_path || prescription.file_path,
        });

        const updated = await db('reservations').where({ id: reservationId }).first();
        return sendJsonResponse(res, true, 200, "Rezervarea a fost actualizată cu succes!", { reservation: updated });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la actualizarea rezervării!", { details: error.message });
    }
});

//Șterge o rețetă
router.delete('/deletePrescription/:prescriptionId', userAuthMiddleware, async (req, res) => {

    try {
        const { prescriptionId } = req.params;
        const userId = req.user?.id;

        if (!prescriptionId) {
            return sendJsonResponse(res, false, 400, "Reteta nu există!", []);
        }

        const userRights = await db('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const prescription = await db('prescriptions')
            .where({ id: prescriptionId }).first();
        if (!prescription) return sendJsonResponse(res, false, 404, "Rezervarea nu există!", []);
        await db('prescriptions').where({ id: prescriptionId }).del();
        return sendJsonResponse(res, true, 200, "Rezervarea a fost ștearsă cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la ștergerea rezervării!", { details: error.message });
    }
});

router.get('/getPrescriptionsByDoctorId', userAuthMiddleware, async (req, res) => {
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

        const prescriptions = await db('users')
            .join('prescriptions', 'users.id', 'prescriptions.patient_id')
            .where('prescriptions.doctor_id', userId)
            .select(
                'prescriptions.id',
                'users.name',
                'users.photo',
                'users.phone',
                'users.email',
                'prescriptions.file_path',
                'prescriptions.created_at',

            )
            .orderBy('prescriptions.updated_at', 'desc')
        if (prescriptions.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rețete!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rețete a fost găsite!', prescriptions);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rețetelor!', { details: error.message });
    }
});

router.get('/getPrescriptionsByPatientId', userAuthMiddleware, async (req, res) => {
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

        const prescriptions = await db('users')
            .join('prescriptions', 'users.id', 'prescriptions.doctor_id')
            .where('prescriptions.patient_id', userId)
            .select(
                'prescriptions.id',
                'users.name',
                'users.photo',
                'users.phone',
                'users.email',
                'prescriptions.file_path',
                'prescriptions.created_at',
            )
            .orderBy('prescriptions.updated_at', 'desc')
        if (prescriptions.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există rețete!', []);
        }
        return sendJsonResponse(res, true, 200, 'Rețete a fost găsite!', prescriptions);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea rețetelor!', { details: error.message });
    }
});



export default router;
