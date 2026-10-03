import { AppointmentsRepository } from '../repositories/appointmentsRepository';
import { createAppointmentSchema, updateAppointmentSchema } from '../schemas';
import { AppError } from '../lib/errors';
export class AppointmentsService {
    repository;
    constructor() {
        this.repository = new AppointmentsRepository();
    }
    /**
     * Create a new appointment
     */
    async createAppointment(data) {
        // Validate input
        const parsedData = createAppointmentSchema.parse(data);
        // Check for time conflicts
        const hasConflict = await this.repository.checkConflict(parsedData.start_at, parsedData.end_at);
        if (hasConflict) {
            throw new AppError('Time slot is already booked', 409);
        }
        return this.repository.create(parsedData);
    }
    /**
     * Get an appointment by ID
     */
    async getAppointmentById(id) {
        const appointment = await this.repository.findById(id);
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }
        return appointment;
    }
    /**
     * Get all appointments for a session
     */
    async getAppointmentsBySessionId(sessionId) {
        return this.repository.findBySessionId(sessionId);
    }
    /**
     * Get all appointments for a user
     */
    async getAppointmentsByUserId(userId) {
        return this.repository.findByUserId(userId);
    }
    /**
     * Update an appointment
     */
    async updateAppointment(id, data) {
        // First check if appointment exists
        const existingAppointment = await this.repository.findById(id);
        if (!existingAppointment) {
            throw new AppError('Appointment not found', 404);
        }
        // Validate input
        const parsedData = updateAppointmentSchema.parse(data);
        // Check for time conflicts (excluding current appointment)
        const startAt = parsedData.start_at ?? existingAppointment.start_at;
        const endAt = parsedData.end_at ?? existingAppointment.end_at;
        const hasConflict = await this.repository.checkConflict(startAt, endAt, id);
        if (hasConflict) {
            throw new AppError('Time slot is already booked', 409);
        }
        return this.repository.update(id, parsedData);
    }
    /**
     * Delete an appointment
     */
    async deleteAppointment(id) {
        const deleted = await this.repository.delete(id);
        if (!deleted) {
            throw new AppError('Appointment not found', 404);
        }
        return deleted;
    }
}
