import { PoolClient, QueryResult } from 'pg';
import { withTransaction, query } from '../lib/database';

export interface Appointment {
  id: string;
  session_id: string;
  user_id: string | null;
  name: string;
  email: string;
  start_at: Date;
  end_at: Date;
  status: 'confirmed' | 'cancelled';
  created_at: Date;
}

export interface CreateAppointmentDTO {
  session_id: string;
  user_id: string | null;
  name: string;
  email: string;
  start_at: Date | string;
  end_at: Date | string;
  status?: 'confirmed' | 'cancelled';
}

export class AppointmentsRepository {
  /**
   * Create a new appointment
   */
  async create(data: CreateAppointmentDTO): Promise<Appointment> {
    const {
      session_id,
      user_id,
      name,
      email,
      start_at,
      end_at,
      status = 'confirmed'
    } = data;

    const result = await query(
      `INSERT INTO appointments (session_id, user_id, name, email, start_at, end_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [session_id, user_id, name, email, start_at, end_at, status]
    );

    return result.rows[0];
  }

  /**
   * Find an appointment by ID
   */
  async findById(id: string): Promise<Appointment | null> {
    const result = await query('SELECT * FROM appointments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find appointments by session ID
   */
  async findBySessionId(session_id: string): Promise<Appointment[]> {
    const result = await query('SELECT * FROM appointments WHERE session_id = $1 ORDER BY created_at DESC', [session_id]);
    return result.rows;
  }

  /**
   * Find appointments by user ID
   */
  async findByUserId(user_id: string): Promise<Appointment[]> {
    const result = await query('SELECT * FROM appointments WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
    return result.rows;
  }

  /**
   * Update an appointment
   */
  async update(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (updates.session_id !== undefined) {
      fields.push(`session_id = $${index++}`);
      values.push(updates.session_id);
    }
    if (updates.user_id !== undefined) {
      fields.push(`user_id = $${index++}`);
      values.push(updates.user_id);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${index++}`);
      values.push(updates.email);
    }
    if (updates.start_at !== undefined) {
      fields.push(`start_at = $${index++}`);
      values.push(updates.start_at);
    }
    if (updates.end_at !== undefined) {
      fields.push(`end_at = $${index++}`);
      values.push(updates.end_at);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id); // for WHERE clause

    const result = await query(
      `UPDATE appointments SET ${fields.join(', ')}
       WHERE id = $${index}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete an appointment
   */
  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM appointments WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  /**
   * Check for conflicting appointments (for the same time range and confirmed status)
   * Excludes the appointment with the given id (if provided) for update checks
   */
  async checkConflict(
    start_at: Date | string,
    end_at: Date | string,
    exclude_id?: string
  ): Promise<boolean> {
    let queryText = `
      SELECT id FROM appointments
      WHERE status = 'confirmed'
      AND tstzrange($1, $2) && tstzrange(start_at, end_at)
    `;
    const values: any[] = [start_at, end_at];

    if (exclude_id) {
      queryText += ' AND id != $3';
      values.push(exclude_id);
    }

    const result = await query(queryText, values);
    return result.rowCount > 0;
  }
}