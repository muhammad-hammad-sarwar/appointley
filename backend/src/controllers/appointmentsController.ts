import { Request, Response, NextFunction } from "express";
import { AppointmentsService } from "../services/appointmentsService.js";
import { AppError } from "../../lib/errors.js";

export class AppointmentsController {
  private appointmentsService: AppointmentsService;

  constructor() {
    this.appointmentsService = new AppointmentsService();
  }

  /**
   * GET /api/appointments/:id
   * Get an appointment by ID
   */
  async getAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (typeof id != "string")
        throw new AppError(400, "VALIDATION_ERROR", "Id is not valid");
      const appointment = await this.appointmentsService.getAppointmentById(id);
      res.json(appointment);
    } catch (error) {
      next(error);
    }
  }
}
