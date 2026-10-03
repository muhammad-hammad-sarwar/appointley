import { Router } from 'express';
import { AppointmentsController } from '../controllers/appointmentsController';

const router = Router();
const controller = new AppointmentsController();

/**
 * GET /api/appointments/:id
 * Get an appointment by ID
 */
router.get('/:id', controller.getAppointment);

export default router;