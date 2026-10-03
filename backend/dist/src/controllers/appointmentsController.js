import { AppointmentsService } from "../services/appointmentsService.js";
import { AppError } from "../../lib/errors.js";
export class AppointmentsController {
    appointmentsService;
    constructor() {
        this.appointmentsService = new AppointmentsService();
    }
    /**
     * GET /api/appointments/:id
     * Get an appointment by ID
     */
    async getAppointment(req, res, next) {
        try {
            const { id } = req.params;
            if (typeof id != "string")
                throw new AppError(400, "VALIDATION_ERROR", "Id is not valid");
            const appointment = await this.appointmentsService.getAppointmentById(id);
            res.json(appointment);
        }
        catch (error) {
            next(error);
        }
    }
}
