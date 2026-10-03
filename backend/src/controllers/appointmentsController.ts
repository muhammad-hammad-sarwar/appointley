import { Request, Response, NextFunction } from 'express';
import { AppointmentsService } from '../services/appointmentsService';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas';
import { AppError } from '../lib/errors';

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
      const appointment = await this.appointmentsService.getAppointmentById(id);
      res.json(appointment);
    } catch (error) {
      next(error);
    }
  }
}