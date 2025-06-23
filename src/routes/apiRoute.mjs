import { Router } from "express";
import users from '../endpoints/users.mjs'
import rights from '../endpoints/rights.mjs'
import reservations from '../endpoints/reservations.mjs'
import prescriptions from '../endpoints/prescriptions.mjs'
import reviews from '../endpoints/reviews.mjs'
const router = Router();

router.use('/users/', users)
router.use('/rights/', rights)
router.use('/reservations/', reservations)
router.use('/prescriptions/', prescriptions)
router.use('/reviews/', reviews)

export default router;

