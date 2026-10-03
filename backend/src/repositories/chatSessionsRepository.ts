import { PoolClient, QueryResult } from "pg";
import { withTransaction, query } from "../lib/database.js";

export interface ChatSession {
  id: string;
  user_id: string | null;
  timezone: string;
  state: "collecting" | "confirming" | "booked";
  draft: Record<string, any>;
  meta: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateChatSessionDTO {
  user_id: string | null;
  timezone?: string;
  state?: "collecting" | "confirming" | "booked";
  draft?: Record<string, any>;
  meta?: Record<string, any>;
}

export class ChatSessionsRepository {
  /**
   * Create a new chat session
   */
  async create(data: CreateChatSessionDTO): Promise<ChatSession> {
    const {
      user_id,
      timezone = "Asia/Karachi",
      state = "collecting",
      draft = {},
      meta = {},
    } = data;

    const result = await query(
      `INSERT INTO chat_sessions (user_id, timezone, state, draft, meta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, timezone, state, JSON.stringify(draft), JSON.stringify(meta)],
    );

    return result.rows[0];
  }

  /**
   * Find a chat session by ID
   */
  async findById(id: string): Promise<ChatSession | null> {
    const result = await query("SELECT * FROM chat_sessions WHERE id = $1", [
      id,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Update a chat session
   */
  async update(
    id: string,
    updates: Partial<ChatSession>,
  ): Promise<ChatSession | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (updates.user_id !== undefined) {
      fields.push(`user_id = $${index++}`);
      values.push(updates.user_id);
    }
    if (updates.timezone !== undefined) {
      fields.push(`timezone = $${index++}`);
      values.push(updates.timezone);
    }
    if (updates.state !== undefined) {
      fields.push(`state = $${index++}`);
      values.push(updates.state);
    }
    if (updates.draft !== undefined) {
      fields.push(`draft = $${index++}`);
      values.push(JSON.stringify(updates.draft));
    }
    if (updates.meta !== undefined) {
      fields.push(`meta = $${index++}`);
      values.push(JSON.stringify(updates.meta));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id); // for WHERE clause

    const result = await query(
      `UPDATE chat_sessions SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${index}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a chat session
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      "DELETE FROM chat_sessions WHERE id = $1 RETURNING id",
      [id],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Find chat sessions by user ID
   */
  async findByUserId(user_id: string): Promise<ChatSession[]> {
    const result = await query(
      "SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id],
    );
    return result.rows;
  }
}
