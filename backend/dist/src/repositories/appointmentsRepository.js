import { query } from "../lib/database.js";
export class AppointmentsRepository {
    /**
     * Create a new appointment
     */
    async create(data) {
        const { session_id, user_id, name, email, start_at, end_at, status = "confirmed", } = data;
        const result = await query(`INSERT INTO appointments (session_id, user_id, name, email, start_at, end_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [session_id, user_id, name, email, start_at, end_at, status]);
        return result.rows[0];
    }
    /**
     * Find an appointment by ID
     */
    async findById(id) {
        const result = await query("SELECT * FROM appointments WHERE id = $1", [
            id,
        ]);
        return result.rows[0] || null;
    }
    /**
     * Find appointments by session ID
     */
    async findBySessionId(session_id) {
        const result = await query("SELECT * FROM appointments WHERE session_id = $1 ORDER BY created_at DESC", [session_id]);
        return result.rows;
    }
    /**
     * Find appointments by user ID
     */
    async findByUserId(user_id) {
        const result = await query("SELECT * FROM appointments WHERE user_id = $1 ORDER BY created_at DESC", [user_id]);
        return result.rows;
    }
    /**
     * Update an appointment
     */
    async update(id, updates) {
        const fields = [];
        const values = [];
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
        const result = await query(`UPDATE appointments SET ${fields.join(", ")}
       WHERE id = $${index}
       RETURNING *`, values);
        return result.rows[0] || null;
    }
    /**
     * Delete an appointment
     */
    async delete(id) {
        const result = await query("DELETE FROM appointments WHERE id = $1 RETURNING id", [id]);
        return result.rowCount ? result.rowCount > 0 : false;
    }
    /**
     * Check for conflicting appointments (for the same time range and confirmed status)
     * Excludes the appointment with the given id (if provided) for update checks
     */
    async checkConflict(start_at, end_at, exclude_id) {
        let queryText = `
      SELECT id FROM appointments
      WHERE status = 'confirmed'
      AND tstzrange($1, $2) && tstzrange(start_at, end_at)
    `;
        const values = [start_at, end_at];
        if (exclude_id) {
            queryText += " AND id != $3";
            values.push(exclude_id);
        }
        const result = await query(queryText, values);
        return result.rowCount ? result.rowCount > 0 : false;
    }
    /**
     * Get confirmed appointment ranges for a given day
     * @param dayStart - Start of day (inclusive)
     * @param dayEnd - End of day (inclusive)
     * @returns Array of confirmed appointment time ranges
     */
    async getConfirmedRanges(dayStart, dayEnd) {
        const result = await query(`SELECT start_at, end_at FROM appointments
       WHERE status = 'confirmed'
       AND end_at > $1
       AND start_at < $2
       ORDER BY start_at`, [dayStart, dayEnd]);
        return result.rows.map((row) => ({
            start: row.start_at,
            end: row.end_at,
        }));
    }
}
