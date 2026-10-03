import { PoolClient, QueryResult } from "pg";
import { withTransaction, query } from "../lib/database.js";

export interface ChatMessage {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "processing" | "done" | "failed";
  meta: Record<string, any>;
  error: string | null;
  created_at: Date;
}

export interface CreateChatMessageDTO {
  session_id: string;
  role: "user" | "assistant";
  content: string;
  status?: "pending" | "processing" | "done" | "failed";
  meta?: Record<string, any>;
  error?: string | null;
}

export class ChatMessagesRepository {
  /**
   * Create a new chat message
   */
  async create(data: CreateChatMessageDTO): Promise<ChatMessage> {
    const {
      session_id,
      role,
      content,
      status = "done",
      meta = {},
      error = null,
    } = data;

    const result = await query(
      `INSERT INTO chat_messages (session_id, role, content, status, meta, error)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [session_id, role, content, status, JSON.stringify(meta), error],
    );

    return result.rows[0];
  }

  /**
   * Find a chat message by ID
   */
  async findById(id: number): Promise<ChatMessage | null> {
    const result = await query("SELECT * FROM chat_messages WHERE id = $1", [
      id,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Find messages for a session
   */
  async findBySessionId(session_id: string): Promise<ChatMessage[]> {
    const result = await query(
      "SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
      [session_id],
    );
    return result.rows;
  }

  /**
   * Update a chat message
   */
  async update(
    id: number,
    updates: Partial<ChatMessage>,
  ): Promise<ChatMessage | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    if (updates.session_id !== undefined) {
      fields.push(`session_id = $${index++}`);
      values.push(updates.session_id);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${index++}`);
      values.push(updates.role);
    }
    if (updates.content !== undefined) {
      fields.push(`content = $${index++}`);
      values.push(updates.content);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(updates.status);
    }
    if (updates.meta !== undefined) {
      fields.push(`meta = $${index++}`);
      values.push(JSON.stringify(updates.meta));
    }
    if (updates.error !== undefined) {
      fields.push(`error = $${index++}`);
      values.push(updates.error);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id); // for WHERE clause

    const result = await query(
      `UPDATE chat_messages SET ${fields.join(", ")}
       WHERE id = $${index}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a chat message
   */
  async delete(id: number): Promise<boolean> {
    const result = await query(
      "DELETE FROM chat_messages WHERE id = $1 RETURNING id",
      [id],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Find pending messages for a session (to prevent race conditions)
   */
  async findPendingBySessionId(
    session_id: string,
  ): Promise<ChatMessage | null> {
    const result = await query(
      "SELECT * FROM chat_messages WHERE session_id = $1 AND status IN ('pending', 'processing') ORDER BY created_at DESC LIMIT 1",
      [session_id],
    );
    return result.rows[0] || null;
  }
}
